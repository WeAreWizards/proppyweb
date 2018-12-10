from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import UUID, JSONB

from ..setup import db


class Event(db.Model):
    """
    Our own analytics system.
    """
    __tablename__ = "shared_proposals_events"
    id = db.Column(db.Integer, primary_key=True)
    # the anon user uid set in their localstorage
    user_uid = db.Column(UUID, nullable=False)
    # load | ping | outbound_click
    kind = db.Column(db.String(100), nullable=False)
    data = db.Column(JSONB, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    shared_proposal_id = db.Column(db.Integer, db.ForeignKey("shared_proposals.id"), nullable=False, index=True)

    def __repr__(self):
        return "<Analytics %r - %r>" % (self.user_uid, self.kind)

    def get_created_at_timestamp(self):
        return int(self.created_at.replace(tzinfo=timezone.utc).timestamp())

    def to_json(self):
        return {
            "userUid": self.user_uid,
            "kind": self.kind,
            "data": self.data,
            "createdAt": self.get_created_at_timestamp(),
        }
