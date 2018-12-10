"""
A thread can be "resolved" when the discussion at hand has
concluded.
"""
from sqlalchemy.dialects.postgresql import UUID

from datetime import datetime, timezone

from ..setup import db


class SharedCommentThread(db.Model):
    __tablename__ = "shared_comment_threads"

    id = db.Column(db.Integer, primary_key=True)
    shared_proposal_id = db.Column(db.Integer, db.ForeignKey("shared_proposals.id"), nullable=False, index=True)
    block_id = db.Column(db.Integer, db.ForeignKey("shared_blocks.id"), nullable=False, index=True)
    block_uid = db.Column(UUID, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    comments = db.relationship("SharedComment", cascade="all,delete-orphan", backref="thread", lazy="dynamic")

    # If resolved is True then updated_at stores when the comment was
    # resolved.
    resolved = db.Column(db.Boolean, default=False, nullable=False)

    def to_json(self):
        return {
            "id": self.id,
            "blockUid": self.block_uid,
            "sharedProposalId": self.shared_proposal_id,
            "resolved": self.resolved,
            "comments": [x.to_json() for x in self.comments.all()],
        }


class SharedComment(db.Model):
    __tablename__ = "shared_comments"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String, nullable=False)
    from_client = db.Column(db.Boolean, default=False, nullable=False)

    # Threads are used for grouping and for storing "resolved" state.
    thread_id = db.Column(db.Integer, db.ForeignKey("shared_comment_threads.id"), nullable=False, index=True)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    comment = db.Column(db.Unicode, nullable=False)

    def to_json(self):
        return {
            "id": self.id,
            "username": self.username,
            "fromClient": self.from_client,
            "threadId": self.thread_id,
            "comment": self.comment,
            "createdAt": int(self.created_at.replace(tzinfo=timezone.utc).timestamp()),
        }
