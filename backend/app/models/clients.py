from datetime import datetime

from sqlalchemy.dialects.postgresql import ARRAY

from ..setup import db


class Client(db.Model):
    __tablename__ = "clients"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)

    name = db.Column(db.String(64), nullable=False)
    contacts = db.Column(ARRAY(db.String), nullable=False, default=[])
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    # coming from integration or not? empty if proppy
    source = db.Column(db.String(64), default="", nullable=False)
    source_id = db.Column(db.String(512), nullable=True)

    proposals = db.relationship("Proposal", backref="client", lazy="dynamic")

    __mapper_args__ = {
        "order_by": name,
    }

    @classmethod
    def get_or_create_by_name(cls, name, company_id):
        client = cls.query.filter_by(name=name.strip(), company_id=company_id).first()
        if client is not None:
            return client

        client = Client(name=name.strip(), company_id=company_id)
        db.session.add(client)
        db.session.commit()
        return client

    def __repr__(self):
        return "<Client %d - %r - %r>" % (self.id, self.name, self.source)

    def to_json(self):
        return {
            "id": self.id,
            "name": self.name,
            "source": self.source,
        }
