import binascii
import os
import sqlalchemy
from sqlalchemy.dialects.postgresql import JSONB

from datetime import datetime, timezone

from ..setup import db
from ..utils.signalling import Trigger


def make_api_key():
    """
    NB this *must* be a callable, don't past the function body into default.
    If you do that we're generating the same API key each time because the
    default value is evaluated at module evaluation time.
    """
    return binascii.hexlify(os.urandom(16)).decode('utf8')


class ZapierIntegration(db.Model):
    """
    If a company has an entry in this database then zapier is enabled.
    """
    __tablename__ = 'zapier_integrations'

    id = db.Column(db.Integer, primary_key=True) # also needed for delete
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False, index=True)

    # randomly generated secret
    api_key = db.Column(db.String(32), nullable=False, default=make_api_key)

    def to_json(self):
        return {
            "apiKey": self.api_key,
        }


class ZapierTriggerEvent(db.Model):
    __tablename__ = 'zapier_trigger_events'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False, index=True)

    # when we created the event
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # event log (retries etc)
    post_event_log = db.Column(JSONB, nullable=False)

    # what we posted to zapier
    data = db.Column(JSONB, nullable=False)


class ZapierHookEndpoint(db.Model):
    __tablename__ = 'zapier_hook_endpoints'

    id = db.Column(db.Integer, primary_key=True) # also needed for delete
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    zapier_integration_id = db.Column(db.Integer, db.ForeignKey('zapier_integrations.id', ondelete="CASCADE"), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id', ondelete="CASCADE"), nullable=False, index=True)
    target_url = db.Column(db.String(2048), nullable=False)
    event = db.Column(db.String(128), nullable=False)
