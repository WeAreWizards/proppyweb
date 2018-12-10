"""
Mirror the mailjet database in form of their JSON responses + a
few denormalized values. Denormalize more values as required.

Naming of tables follows mailjet API.
"""
from sqlalchemy.dialects.postgresql import JSONB

from ..setup import db
from .users import CIText


class Contact(db.Model):
    __tablename__ = 'mailjet_contact'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(CIText(), unique=True, nullable=False)
    json_response = db.Column(JSONB, nullable=False)


class Message(db.Model):
    __tablename__ = 'mailjet_message'

    id = db.Column(db.BigInteger, primary_key=True)
    json_response = db.Column(JSONB, nullable=False)

    # A proppy-set string that helps us classify what this message
    # is used for, e.g. "welcome", "notification", ...
    message_reason = db.Column(db.String(), nullable=False)


class ClickStatistics(db.Model):
    __tablename__ = 'mailjet_click_statistics'

    id = db.Column(db.BigInteger, primary_key=True)
    message_id = db.Column(db.BigInteger, db.ForeignKey("mailjet_message.id"), nullable=False)
    contact_id = db.Column(db.Integer, db.ForeignKey("mailjet_contact.id"), nullable=False)
    json_response = db.Column(JSONB, nullable=False)
    clicked_at = db.Column(db.DateTime, nullable=False)


class OpenInformation(db.Model):
    __tablename__ = 'mailjet_open_information'

    id = db.Column(db.BigInteger, primary_key=True)
    message_id = db.Column(db.BigInteger, db.ForeignKey("mailjet_message.id"), nullable=False)
    contact_id = db.Column(db.Integer, db.ForeignKey("mailjet_contact.id"), nullable=False)
    json_response = db.Column(JSONB, nullable=False)
    opened_at = db.Column(db.DateTime, nullable=False)
