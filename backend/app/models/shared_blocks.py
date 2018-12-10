from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from ..setup import db
from .enums import BlockTypeDBEnum


class SharedBlock(db.Model):
    """
    These blocks are inserted once and then never modified. "Shared" means frozen
    forever.
    """
    __tablename__ = "shared_blocks"

    id = db.Column(db.Integer, primary_key=True)  # needed for sqlalchemy
    uid = db.Column(UUID, nullable=False)
    shared_proposal_id = db.Column(db.Integer, db.ForeignKey("shared_proposals.id"), nullable=False, index=True)

    type = db.Column(BlockTypeDBEnum, nullable=False)
    data = db.Column(JSONB, nullable=False)
    ordering = db.Column(db.Integer, nullable=False)

    threads = db.relationship(
        "SharedCommentThread",
        backref="block",
        lazy="dynamic",
        cascade="all,delete-orphan"
    )

    __table_args__ = (
        db.UniqueConstraint("shared_proposal_id", "uid"),
    )

    def __repr__(self):
        return "<SharedBlock %r - %r>" % (self.type, self.uid)

    @classmethod
    def from_proposal_block(cls, block):
        """
        Freeze a single block.
        """
        return cls(
            uid=block.uid,
            type=block.type,
            data=block.data,
            ordering=block.ordering,
        )

    def to_json(self):
        return {
            "uid": self.uid,
            "proposalId": self.shared_proposal_id,
            "type": self.type,
            "ordering": self.ordering,
            "data": self.data,
        }
