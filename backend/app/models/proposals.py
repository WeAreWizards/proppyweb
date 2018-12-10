import itertools
from datetime import datetime, timezone
from flask import current_app

from sqlalchemy.dialects.postgresql import ARRAY

from ..setup import db
from .enums import ProposalStatusDBEnum, BlockType, ProposalStatus
from .shared_proposals import SharedProposal
from .shared_blocks import SharedBlock
from .blocks import Block
from ..utils.exceptions import AuthException
from typing import List, Dict, Any


class Proposal(db.Model):
    __tablename__ = "proposals"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey("clients.id"), nullable=True)

    share_uid = db.Column(db.String(10), nullable=False, unique=True)
    title = db.Column(db.String(255), nullable=False)
    tags = db.Column(ARRAY(db.String()), default=[], nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    changed_status_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    status = db.Column(ProposalStatusDBEnum, default="draft", nullable=False)
    cover_image_url = db.Column(db.String(2048), default="", nullable=False)

    blocks = db.relationship("Block", cascade="all,delete-orphan", backref="proposal", lazy="dynamic")
    shared_proposals = db.relationship("SharedProposal", cascade="all,delete-orphan", backref="proposal", lazy="dynamic")
    # TODO: Potentially add `owner` or at least `created by`
    signature = db.relationship("Signature", cascade="all,delete-orphan", backref="proposal", lazy="dynamic")

    def __repr__(self):
        return "<Proposal %r - %r>" % (self.title, self.id)

    def get_shared_version_number(self):
        return self.shared_proposals.value(db.func.max(SharedProposal.version)) or 0

    def get_latest_shared(self):
        return self.shared_proposals.order_by(SharedProposal.version.desc()).first()

    def create_shared(self, sent_to):
        """
        Creates a SharedProposal from itself
        """
        version = self.get_shared_version_number() + 1
        share = SharedProposal(
            proposal=self,
            title=self.title,
            version=version,
            sent_to=sent_to,
            cover_image_url=self.cover_image_url
        )

        # It seems that on some occasions, the for loop adding blocks fails
        # because shared_proposal_id=None so we try to force it
        # See https://sentry.wearewizards.io/wearewizards/backend/issues/1756/
        db.session.add(share)

        for x in self.blocks:
            share.blocks.append(SharedBlock.from_proposal_block(x))

        return share

    def duplicate(self):
        """
        Duplicate a proposal along with its blocks, new uuids are generated in
        `block.duplicate` automatically
        """
        copied = Proposal(
            title="Copy of %s" % self.title,
            tags=self.tags,
            company_id=self.company_id,
            cover_image_url=self.cover_image_url
        )

        for block in self.blocks:
            copied.blocks.append(block.duplicate())

        return copied

    def get_import_section_blocks(self, section_uid):
        """
        Imports the section identified by `section_uid` after the item with.
        """
        section_to_import = Block.query.filter(
            Block.uid == str(section_uid),
            Block.proposal_id == Proposal.id,
            Proposal.company_id == self.company_id,
        ).first()
        if section_to_import is None:
            raise AuthException('section_uid {} not found'.format(section_uid))

        def insertions():
            is_clipping = False
            stop_on = [BlockType.Section.value] \
                if section_to_import.type == BlockType.Section.value \
                else [BlockType.Section.value, BlockType.Subtitle.value]

            for block in section_to_import.proposal.blocks.order_by(Block.ordering).all():
                if is_clipping and block.type in stop_on:
                    break
                if block.uid == section_uid:
                    is_clipping = True
                if is_clipping:
                    yield block.clone_for_import()

        return list(insertions())

    def is_active(self):
        return self.status in [ProposalStatus.Draft.value, ProposalStatus.Sent.value]

    def extract_search_content(self):
        """
        Returns 4-tuple (uid, level, title, content) for section and subsection
        level can be h1 or h2
        """
        all_blocks = self.blocks.order_by(Block.ordering).all()

        def group_by(kind):
            i = 0
            for block in all_blocks:
                if block.type == kind:
                    i += 1
                yield i, block

        sections = itertools.groupby(group_by(BlockType.Section.value), lambda x: x[0])
        subsections = itertools.groupby(group_by(BlockType.Subtitle.value), lambda x: x[0])
        # We want to search on the content of the following blocks
        block_types = (
            BlockType.H3.value,
            BlockType.Paragraph.value,
            BlockType.UnorderedItem.value,
            BlockType.OrderedItem.value,
        )

        def extract_text(grouped, level):
            values = []
            for _, group in grouped:
                uid, title = None, None
                content = []
                for _, b in group:
                    if level == "h1" and b.type == BlockType.Section.value:
                        uid, title = b.uid, b.data.get("value", "")
                    elif level == "h2" and b.type == BlockType.Subtitle.value:
                        uid, title = b.uid, b.data.get("value", "")

                    # Don't append content if there's no uid
                    if uid is None:
                        continue

                    # Stop if we encountered a section as a h2
                    if level == "h2" and b.type == BlockType.Section.value:
                        break

                    if b.type in block_types:
                        content.append(b.data.get('value', ""))
                    elif level == "h1" and b.type == BlockType.Subtitle.value:
                        content.append(b.data.get('value', ""))

                if uid is not None:
                    values.append((uid, level, title, " ".join(content)))

            return values

        return extract_text(sections, "h1") + extract_text(subsections, "h2")

    def is_signed(self):
        return self.signature.count() > 0

    def get_analytics_data(self):
        """
        Gets all the data needed to render the analytics page.
        Proposal itself, all published versions and comments/events for each
        """
        analytics = []
        for shared in self.shared_proposals.order_by(SharedProposal.version.desc()).all():
            analytics.append({
                "version": shared.version,
                "title": shared.title,
                "createdAt": int(shared.created_at.replace(tzinfo=timezone.utc).timestamp()),
                "commentsCount": shared.get_comments_count(),
                "analytics": shared.get_analytics(),
            })

        return analytics

    def to_json(self):
        shares = [] # type: List[Dict[str, Any]]
        latest_share = self.get_latest_shared()
        # Only fetch one right now, could fetch more if we want to display
        # a project timeline
        if latest_share is not None:
            shares = [latest_share.to_private_json()]

        return {
            "id": self.id,
            "clientId": self.client_id,
            "title": self.title,
            "tags": self.tags,
            "shareUid": self.share_uid,
            "status": self.status,
            "changedStatusAt": int(self.updated_at.replace(tzinfo=timezone.utc).timestamp()),
            "updatedAt": int(self.updated_at.replace(tzinfo=timezone.utc).timestamp()),
            "createdAt": int(self.created_at.replace(tzinfo=timezone.utc).timestamp()),
            "coverImageUrl": self.cover_image_url,
            "shares": shares,
            "signed": self.is_signed(),
        }

    def get_share_link(self):
        return "{}/p/{}".format(current_app.config["BASE_URL"], self.share_uid)
