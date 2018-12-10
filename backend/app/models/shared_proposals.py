from collections import Counter
from datetime import datetime, timezone
from itertools import groupby

from sqlalchemy.dialects.postgresql import ARRAY

from .enums import BlockType
from ..setup import db
from .analytics import Event

from typing import NamedTuple, List, Dict, Any

#IdList = NewType('IdList', List[UserId])

Analytics = NamedTuple("Analytics", [
    ("numberViews", int),
    ("lastSessionTimestamp", int),
    ("outboundClicks", List[Dict[str, Any]]),
    ("sessions", List[Dict[str, Any]]),   # {start, end, length, data} dict
    ("averageSessionLength", int),  # in seconds
])



# Our ips, we want to ignore them when displaying analytics
WAW_IPS = [
    "52.48.10.88",
    "52.16.92.204",
    "52.17.250.230",
    "52.48.132.132",
    "52.49.146.33",
]


class SharedProposal(db.Model):
    """
    A "shared proposal" is a frozen version of a proposal to be sent to a client.
    """
    __tablename__ = "shared_proposals"

    id = db.Column(db.Integer, primary_key=True)  # needed for sqlalchemy
    proposal_id = db.Column(db.Integer, db.ForeignKey("proposals.id"), nullable=False)

    title = db.Column(db.String, nullable=False)
    cover_image_url = db.Column(db.String(2048), default="", nullable=False)
    # We record a version number which people can use to communicate
    # (we enforce a linear history).
    version = db.Column(db.Integer, nullable=False)
    # Email stuff, we pre-fill new sharing with data from the previous shared one
    # if it exists
    sent_to = db.Column(ARRAY(db.String()), nullable=False, default=[])
    subject = db.Column(db.String(300), nullable=False, default="")
    from_name = db.Column(db.String(50), nullable=False, default="")
    body = db.Column(db.String(5000), nullable=False, default="")

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    blocks = db.relationship(
        "SharedBlock",
        backref="shared_proposal",
        lazy="dynamic",
        cascade="all,delete-orphan",
    )
    comment_threads = db.relationship(
        "SharedCommentThread",
        backref="shared_proposal",
        lazy="dynamic",
        cascade="all,delete-orphan",
    )
    events = db.relationship(
        "Event",
        backref="shared_proposal",
        lazy="dynamic",
        cascade="all,delete-orphan",
    )
    signature = db.relationship(
        "Signature",
        backref="shared_proposal",
        lazy="dynamic",
        cascade="all,delete-orphan",
    )

    def __repr__(self):
        return "<Share %r - %r>" % (self.id, self.version)

    def to_json(self):
        return {
            "id": self.id,
            "signed": self.signature.count() > 0,
            "version": self.version,
            "title": self.title,
            "coverImageUrl": self.cover_image_url,
            "createdAt": int(self.created_at.replace(tzinfo=timezone.utc).timestamp()),
        }

    def get_comments_count(self):
        count = 0
        # TODO: optimise that if needed (probably not)
        for thread in self.comment_threads.all():
            count += thread.comments.count()
        return count

    def get_analytics(self):
        """
        Prepare analytics for the page in the app
        """
        events = self.events.order_by(Event.created_at).all()
        # Remove our servers ips from the data returned
        events = [e for e in events if e.data.get("ip") not in WAW_IPS]

        views = [e for e in events if e.kind == "load"]
        last_session_timestamp = 0
        if len(views) > 0:
            last_session_timestamp = views[len(views) - 1].get_created_at_timestamp()

        outbound_clicks = Counter(e.data["url"] for e in events if e.kind == "outbound_click")

        sorted_outbound_clicks = sorted(
            ({"url": url, "count": count} for url, count in outbound_clicks.items()),
            key=lambda o: o["count"], reverse=True
        )

        # Sorting per user uid to groupby
        session_events = sorted(
            [e for e in events if e.kind == "load" or e.kind == "ping"],
            key=lambda e: e.user_uid
        )
        sessions = []
        for uid, group in groupby(session_events, lambda e: e.user_uid):
            events = sorted(group, key=lambda e: e.created_at)
            current_session = None # type: Any

            for e in events:
                if e.kind == "load":
                    if current_session is not None and current_session["end"] > -1:
                        current_session["length"] = current_session["end"] - current_session["start"]
                        sessions.append(current_session)
                    # start a new session
                    current_session = {
                        "start": e.get_created_at_timestamp(),
                        "end": -1,
                        "data": e.data,
                    }
                elif e.kind == "ping":
                    if current_session is None:
                        # Ping before a load? disregard
                        continue
                    current_session["end"] = e.get_created_at_timestamp()

            # don't forget to add the last session
            if current_session:
                # session ended before the first ping? Count that as a 1s session
                if current_session["end"] == -1:
                    current_session["length"] = 1
                else:
                    current_session["length"] = current_session["end"] - current_session["start"]
                sessions.append(current_session)

        averageSessionLength = 0
        if len(sessions) > 0:
            averageSessionLength = int(
                sum([s["length"] for s in sessions]) / len(sessions)
            )

            # and re-sort session in a desc order this time for showing
            # newer ones first
            sessions = sorted(sessions, key=lambda s: s["start"], reverse=True)

        return Analytics(
            numberViews=len(views),
            lastSessionTimestamp=last_session_timestamp,
            outboundClicks=sorted_outbound_clicks,
            sessions=sessions,
            averageSessionLength=averageSessionLength,
        )._asdict()

    def get_signature_block(self):
        return self.blocks.filter_by(type=BlockType.Signature.value).first()

    def get_payment_block(self):
        return self.blocks.filter_by(type=BlockType.Payment.value).first()

    def to_private_json(self):
        """
        Used in sharing page for example to get some data we don't want to
        publicly display in the shared proposal page
        """
        data = self.to_json()
        data.update({
            "sentTo": self.sent_to,
            "subject": self.subject,
            "from": self.from_name,
            "body": self.body,
        })
        return data

    def get_signing_doc(self, signature, name, user_ip, user_agent):
        blocks = [x.to_json() for x in self.blocks.order_by('ordering')]

        signing_doc = self.to_json()
        signing_doc["blocks"] = blocks
        signing_doc["fromIp"] = user_ip
        signing_doc["signatureImage"] = signature
        signing_doc["userAgent"] = user_agent
        signing_doc["nameTyped"] = name

        return signing_doc

    @classmethod
    def get_latest_by_share_uid(cls, share_uid):
        return cls.query.filter(
            cls.proposal.has(share_uid=share_uid)
        ).order_by(cls.version.desc()).first()

    @classmethod
    def get_by_share_uid_and_version(cls, share_uid, version):
        return cls.query.filter(
            cls.proposal.has(share_uid=share_uid),
            cls.version == version,
        ).first()

    @classmethod
    def count_versions(cls, share_uid):
        return cls.query.filter(
            cls.proposal.has(share_uid=share_uid)
        ).count()
