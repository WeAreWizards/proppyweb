from datetime import datetime, timedelta, timezone
import json
import enum

import requests
from flask import current_app
from sqlalchemy.dialects.postgresql import JSONB

from ..setup import db
from .proposals import Proposal
from .enums import ProposalStatus
from . import integrations # required for sqlalchemy to resolve the "ContactsIntegration" table.

DEFAULT_BRANDING = {
    "fontHeaders": "Lato",
    "fontBody": "ff-tisa-web-pro",
    "primaryColour": "#40C181",
    "bgColour": "#fff",
    "textColour": "#454B4F",
}

class PublishState(enum.Enum):
    CAN_PUBLISH = "can_publish"
    TRIAL_HAS_ENDED_PLEASE_SUBSCRIBE = "trial_has_ended_please_subscribe"
    PLAN_TOO_SMALL_PLEASE_UPGRADE = "plan_too_small_please_upgrade"
    USER_INACTIVE_CANNOT_PUBLISH = "user_inactive_cannot_publish"


class Company(db.Model):
    __tablename__ = "companies"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(db.String(512), nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    users = db.relationship("User", backref="company", lazy="dynamic", cascade="all, delete-orphan")
    clients = db.relationship("Client", backref="company", lazy="dynamic", cascade="all, delete-orphan")
    proposals = db.relationship("Proposal", backref="company", lazy="dynamic", cascade="all, delete-orphan")

    integration_contacts = db.relationship(
        "ContactsIntegration",
        backref="company",
        lazy="dynamic",
        cascade="all, delete-orphan"
    )
    # 1-to-1 with sub
    subscription_cache = db.relationship(
        "ChargebeeSubscriptionCache",
        backref="company",
        cascade="all, delete-orphan",
        uselist=False
    )
    slack = db.relationship(
        "SlackIntegration",
        backref="company",
        cascade="all, delete-orphan",
        uselist=False
    )
    zoho_crm = db.relationship(
        "ZohoCRMIntegration",
        backref="company",
        cascade="all, delete-orphan",
        uselist=False
    )
    insightly = db.relationship(
        "InsightlyIntegration",
        backref="company",
        cascade="all, delete-orphan",
        uselist=False
    )
    pipedrive = db.relationship(
        "PipedriveIntegration",
        backref="company",
        cascade="all, delete-orphan",
        uselist=False
    )
    stripe = db.relationship(
        "StripeIntegration",
        backref="company",
        cascade="all, delete-orphan",
        uselist=False
    )
    zapier = db.relationship(
        "ZapierIntegration",
        backref="company",
        cascade="all, delete-orphan",
        uselist=False
    )

    # Allow overriding the trial end for some users. Can be abused to
    # give people "forever free" accounts.
    trial_expiry_date_override = db.Column(db.DateTime, default=None, nullable=True)

    currency = db.Column(db.String(10), nullable=False, default="GBP")
    logo_url = db.Column(db.String(4096), nullable=True)
    branding = db.Column(
        JSONB,
        nullable=False,
        server_default=json.dumps(DEFAULT_BRANDING)
    )

    def __repr__(self):
        return "<Company %r - %d>" % (self.name, self.id)

    def get_trial_expiry_date(self):
        """
        This returns the end of the trial period for the company except that
        during beta we don't want to actually expire the trial so that's only
        for the companies created after release.
        """
        if self.trial_expiry_date_override is not None:
            return self.trial_expiry_date_override

        now = datetime.utcnow()

        # TODO: and remove the check completely a few weeks after release
        # We can also a grace period of 14 days after the end of a subscription
        release = datetime(year=2016, month=10, day=4)

        # Anyone signing up before the beta cutoff gets a 61 day
        # extended trial:
        if now <= release or self.created_at <= release:
            return release + timedelta(days=61)

        return self.created_at + timedelta(days=current_app.config["TRIAL_LENGTH"])

    def get_trial_expiry_timestamp(self):
        return int(self.get_trial_expiry_date().replace(tzinfo=timezone.utc).timestamp())

    def get_active_users(self):
        """Exclude inactive and disabled users"""
        return [u for u in self.users.all() if u.is_active and not u.disabled]

    def get_admins(self):
        return [u for u in self.get_active_users() if u.is_admin]

    def get_active_users_number(self):
        """Exclude inactive and disabled users from the count"""
        return len(self.get_active_users())

    def get_team_emails(self):
        """
        Gets all the user emails we can send emails to.

        Not sending to unactivated users as it could be used for spam
        and invited users that didn't sign up yet would receive it
        """
        return [
            u.email for u in self.users.filter_by(disabled=False, activation_token=b'')
        ]

    def get_number_admin_users(self):
        return self.users.filter_by(is_admin=True, disabled=False).count()

    def get_number_active_proposals(self):
        return self.proposals.filter(
            Proposal.status.in_(
                [ProposalStatus.Draft.value, ProposalStatus.Sent.value]
            )
        ).count()

    def can_add_new_active_proposal(self) -> PublishState:
        """
        Whether a user can create/duplicate a proposal or move one inactive
        to being active
        """
        # TODO should probably use a sum type?
        if not self.trial_has_ended():
            return PublishState.CAN_PUBLISH

        if self.subscription_cache is None:
            return PublishState.TRIAL_HAS_ENDED_PLEASE_SUBSCRIBE

        if self.get_number_active_proposals() < self.subscription_cache.get_active_limit():
            return PublishState.CAN_PUBLISH
        else:
            return PublishState.PLAN_TOO_SMALL_PLEASE_UPGRADE

    def publish_state(self) -> PublishState:
        """
        Whether the company is in trial or has a sub.
        Will return false for cancelled sub or if the company reached the
        max allowed number of proposals.
        """
        if not self.trial_has_ended():
            return PublishState.CAN_PUBLISH

        if self.subscription_cache:
            if self.subscription_cache.data["status"] == "cancelled":
                return PublishState.PLAN_TOO_SMALL_PLEASE_UPGRADE
            return self.can_add_new_active_proposal()

        return PublishState.TRIAL_HAS_ENDED_PLEASE_SUBSCRIBE

    def trial_has_ended(self):
        return self.get_trial_expiry_date() < datetime.utcnow()

    def is_paying(self):
        if not self.subscription_cache:
            return False

        return self.subscription_cache.can_cancel()

    def to_json(self):
        # TODO(tom): this should be in the DB or some other config file.
        if self.id == 37:
            whitelabel_domain = 'proposals.wearewizards.io'
        elif self.id == 1858:
            whitelabel_domain = 'proposals.webmodeinc.com'
        elif self.id == 1886:
            whitelabel_domain = 'quotes.digisavvy.com'
        else:
            whitelabel_domain = None

        # TODO: we don't actually use all of that in the frontend
        return {
            "id": self.id,
            "name": self.name,
            "currency": self.currency,
            "logoUrl": self.logo_url,
            "branding": self.branding,
            "trialExpiryTimestamp": self.get_trial_expiry_timestamp(),
            "trialHasEnded": self.trial_has_ended(),
            "whitelabelDomain": whitelabel_domain,
            "integrations": {
              "slack": self.slack.to_json() if self.slack else None,
              "zohocrm": True if self.zoho_crm else False,
              "insightly": True if self.insightly else False,
              "pipedrive": True if self.pipedrive else False,
              "stripe": self.stripe.to_json() if self.stripe else None,
              "zapier": self.zapier.to_json() if self.zapier is not None else None,
            },
        }

    def to_public_json(self):
        """
        Use this function when serializing JSON for "public" use, e.g. in
        a shared proposal.
        """
        return {
            "name": self.name,
            "logoUrl": self.logo_url,
            "currency": self.currency,
            "branding": self.branding,
            "integrations": {
              "stripe": self.stripe.to_json() if self.stripe else None,
            },
        }

    @property
    def number_users(self):
        """Used by the admin"""
        return self.users.count()

    @property
    def number_proposals(self):
        """Used by the admin. Ignores Start here! proposals"""
        return self.proposals.filter(Proposal.title != "Start here!").count()

    @property
    def number_shared_proposals(self):
        """Used by the admin"""
        return len([p for p in self.proposals.all() if p.shared_proposals.count() > 0])

    def do_proposal_view_integrations(self, shared, viewing_data):
        """
        Ping whatever integration we have that happens on a proposal viewing
        """
        if self.slack and self.slack.post_on_view:
            location = ""
            if viewing_data["city"]:
                location = "in %s, %s" % (viewing_data["city"], viewing_data["country"])
            user = viewing_data["username"] if viewing_data["username"] else "Someone"

            message = "%s has opened your proposal \"%s\" %s" % (user, shared.title, location)
            response = requests.post(self.slack.webhook_url, json={"text": message})

            if response.status_code != 200:
                # TODO: log error
                print("SLACK ERROR ON VIEW: %s" % response.text)

    def do_proposal_comment_integrations(self, shared, comment, username):
        if self.slack and self.slack.post_on_comment:
            message = "A comment has been posted on %s" % shared.proposal.title
            attachment = {
                "color": "#40C181",
                "author_name": username,
                "title": shared.proposal.title,
                # TODO: handle custom domain
                "title_link": "https://app.proppy.io/p/%s" % shared.proposal.share_uid,
                "text": comment,
                "fallback": comment,

            }
            response = requests.post(self.slack.webhook_url, json={
                "text": message,
                "attachments": [attachment]
            })

            if response.status_code != 200:
                # TODO: log error
                print("SLACK ERROR ON COMMENT: %s" % response.text)

    def do_proposal_signature_integrations(self, shared):
        if self.slack and self.slack.post_on_signature:
            message = "Your proposal \"%s\" has been signed!" % shared.title
            response = requests.post(self.slack.webhook_url, json={"text": message})

            if response.status_code != 200:
                # TODO: log error
                print("SLACK ERROR ON SIGNATURE: %s" % response.text)

    def delete_clients_from_integration(self, name):
        """
        Delete all clients and contacts from integration `name`
        unless they are used in a proposal.
        Returns the list of sourceIds of clients left in the system
        """
        left = []

        self.integration_contacts.filter_by(source=name).delete()

        for client in self.clients.filter_by(source=name):
            print("Deleting %s" %client)
            if client.proposals.count() == 0:
                db.session.delete(client)
            else:
                left.append(client.source_id)

        return left
