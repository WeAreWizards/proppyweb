from datetime import datetime

from sqlalchemy.dialects.postgresql import JSONB
from ..setup import db


class SlackIntegration(db.Model):
    __tablename__ = "slack_integrations"

    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(512), nullable=False)
    team_name = db.Column(db.String(512), nullable=False)
    # which channel it's posting on, can only be one
    channel = db.Column(db.String(512), nullable=False)
    webhook_url = db.Column(db.String(512), nullable=False)

    post_on_view = db.Column(db.Boolean, default=False)
    post_on_comment = db.Column(db.Boolean, default=False)
    post_on_signature = db.Column(db.Boolean, default=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)

    def to_json(self):
        return {
            "teamName": self.team_name,
            "channel": self.channel,
            "webhookUrl": self.webhook_url,
            "postOnView": self.post_on_view,
            "postOnComment": self.post_on_comment,
            "postOnSignature": self.post_on_signature,
        }


class ZohoCRMIntegration(db.Model):
    __tablename__ = "zohocrm_integrations"

    id = db.Column(db.Integer, primary_key=True)
    auth_token = db.Column(db.String(512), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)


class PipedriveIntegration(db.Model):
    __tablename__ = "pipedrive_integrations"

    id = db.Column(db.Integer, primary_key=True)
    api_token = db.Column(db.String(512), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)


class InsightlyIntegration(db.Model):
    __tablename__ = "insightly_integrations"

    id = db.Column(db.Integer, primary_key=True)
    api_key = db.Column(db.String(512), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)


class ContactsIntegration(db.Model):
    """
    Contacts imported from CRM and others
    """
    __tablename__ = "contacts_integrations"

    id = db.Column(db.Integer, primary_key=True)
    source = db.Column(db.String(512), nullable=False)
    contacts = db.Column(JSONB, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)

    def to_json(self):
        return {
            "source": self.source,
            "contacts": self.contacts,
        }


class StripeIntegration(db.Model):
    __tablename__ = "stripe_integrations"

    id = db.Column(db.Integer, primary_key=True)

    token_type = db.Column(db.String(50), nullable=False)
    stripe_publishable_key = db.Column(db.String(512), nullable=False)
    scope = db.Column(db.String(50), nullable=False)
    livemode = db.Column(db.Boolean)
    stripe_user_id = db.Column(db.String(512), nullable=False)
    refresh_token = db.Column(db.String(512), nullable=False)
    access_token = db.Column(db.String(512), nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)

    def to_json(self):
        return {
            "stripe_publishable_key": self.stripe_publishable_key,
            "access_token": self.access_token,
        }
