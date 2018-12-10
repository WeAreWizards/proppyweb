from datetime import datetime

from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from ..setup import db
from .enums import BlockType, BlockTypeDBEnum


# Default dict for the json data attribute of a block
DEFAULT_DATA = {
    BlockType.Section.value: {"value": ""},
    BlockType.Paragraph.value: {"value": ""},
    BlockType.Subtitle.value: {"value": ""},
    BlockType.UnorderedItem.value: {"value": ""},
    BlockType.OrderedItem.value: {"value": ""},
    BlockType.Signature.value: {},
    BlockType.Divider.value: {},
    BlockType.H3.value: {"value": ""},
    BlockType.Payment.value: {},
    BlockType.Table.value: {},
}


class Block(db.Model):
    """
    Base block of a proposal
    """
    __tablename__ = 'blocks'

    uid = db.Column(UUID, primary_key=True)

    # Blocks can be detached from the proposal (hence nullable)
    # because we want to keep them and their comments around even when
    # they have been deleted on the client side.
    #
    # This allows us to UNDO purely client side and the blocks will
    # magically re-appear on the DB (because we still have them with
    # ther comments).
    proposal_id = db.Column(db.Integer, db.ForeignKey('proposals.id'), nullable=True, index=True)

    type = db.Column(BlockTypeDBEnum, nullable=False)
    data = db.Column(JSONB, nullable=False)
    ordering = db.Column(db.Integer, nullable=False)

    # Version is a millisecond timestamp from the client. TODO: rename to
    # client_updated_at
    version = db.Column(db.BigInteger, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return '<Block %r - %r>' % (self.type, self.uid)

    def __init__(self, block_type, proposal_id=None, uid=None, version=None, data=None, ordering=None):
        self.uid = uid if uid is not None else str(uuid.uuid4())
        self.type = block_type
        self.ordering = ordering
        self.proposal_id = proposal_id
        self.version = version if version is not None else 0
        self.data = data if data is not None else DEFAULT_DATA[block_type]

    def duplicate(self):
        """
        Duplicate a block: only care about type/ordering and data. Resets
        everything else
        """
        return Block(self.type, data=self.data, ordering=self.ordering)

    def clone_for_import(self):
        """
        Very similar to duplicate but doesn't care about ordering and
        removes data from signature block
        """
        data = self.data
        if self.type == BlockType.Signature.value:
            data = {}
        block = Block(self.type, data=data)
        return block

    def to_json(self):
        return {
            "uid": self.uid,
            "proposalId": self.proposal_id,
            "type": self.type,
            "ordering": self.ordering,
            "version": self.version,
            "data": self.data,
        }

    def dump_data(self):
        """Same as to_json but only dump the data"""
        return {
            "type": self.type,
            "data": self.data,
        }
