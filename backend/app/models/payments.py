import time
from datetime import datetime

import chargebee
from sqlalchemy.dialects.postgresql import JSONB

from ..setup import db


# We return a "fake" subscription that doesn't exist in chargebee for
# people who have not signed up to chargebee yet.
def trial_subscription(company):
    return {
        "trialEnd": company.get_trial_expiry_timestamp(),
        "trialHasEnded": company.trial_has_ended(),
        "status": "in_trial",
        "plan": "medium",
        "isChargebeeSubscription": False,
    }


class ChargebeeSubscriptionCache(db.Model):
    """Cache for a chargebee subscription.
    See https://apidocs.chargebee.com/docs/api/subscriptions#subscription_attributes

    We only keep what we need to render the payment page.
    """
    __tablename__ = "chargebee_subscription_cache"

    id = db.Column(db.String, primary_key=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False, index=True)
    data = db.Column(JSONB, nullable=False)

    def to_json(self):
        return {
            "trialEnd": self.data["trial_end"],
            "trialHasEnded": True if self.data["trial_end"] is None else self.data["trial_end"] < time.time(),
            "status": self.data["status"],
            "canCancel": self.can_cancel(),
            "cardStatus": self.data["card_status"],
            "plan": self.data["plan_id"],
            "isChargebeeSubscription": True,
            "cardType": self.data["card_type"],
            "cardLast4": self.data["card_last4"],
            "cardExpiry": self.data["card_expiry"],
        }

    def __repr__(self):
        return "<ChargebeeSubscriptionCache {}>".format(self.to_json())

    def is_special_plan(self):
        """
        Whether the sub is a special plan, like an enterprise deal where they
        pay per year for unlimited users
        """
        return self.data["plan_id"] not in ["standard", "plus"]

    def can_cancel(self):
        return self.data["status"] not in ["non_renewing", "cancelled"]

    def get_active_limit(self):
        """
        How many proposal can we have active per plan per term
        """
        if self.data["plan_id"] in ["basic", "basic-yearly"]:
            return 5
        elif self.data["plan_id"] in ["professional", "professional-yearly"]:
            return 30
        elif self.data["plan_id"] in ["enterprise", "enterprise-yearly"]:
            return 100
        else:
            return 100000

    def get_all_invoices(self):
        """
        See https://apidocs.chargebee.com/docs/api/invoices#list_invoices
        for documentation
        """
        response = chargebee.Invoice.list({
            "subscription_id[is]": self.data["sub_id"],
            "sort_by[desc]": "date",
        })

        return [entry.invoice for entry in response]

    def is_invoice_from_sub(self, invoice_id):
        try:
            invoice = chargebee.Invoice.retrieve(invoice_id).invoice
            return invoice.customer_id == str(self.company_id)
        except chargebee.api_error.InvalidRequestError as e:
            # TODO: log error
            return False

    @classmethod
    def refetch(cls, company_id):
        """
        This function returns either the cached subscription object or
        waits for up to N seconds for chargebee to create one for us.

        This allows us to test billing without webhooks. Webhooks become
        an optimization to invalidate our cache when plan or card changes
        occur.

        NB that this ties up a subscription_id web worker so is a potential DOS attack
        vector.
        """
        try:
            result = chargebee.Customer.retrieve(company_id)
        except chargebee.api_error.InvalidRequestError as e:
            if e.error_code == "resource_not_found":
                return None
            raise

        for i in range(5):
            try:
                result = chargebee.Subscription.list({"customer_id[is]": company_id})
                if len(result) == 0:
                    time.sleep(1)
                    continue
                break
            except chargebee.api_error.InvalidRequestError as e:
                time.sleep(1)
                continue
        else:
            return None

        #assert len(result) == 1, "found more than one subscription for customer {}".format(company_id)

        sub = result[0].subscription
        card = result[0].card
        data = {
            "sub_id": sub.id,
            "plan_id": sub.plan_id,
            "status": sub.status,
            "trial_end": sub.trial_end,
            "current_term_start": sub.current_term_start,
            "current_term_end": sub.current_term_end,
            "card_status": card.status,
            "card_type": card.card_type,
            "card_last4": card.last4,
            "card_expiry": "{}/{}".format(card.expiry_month, card.expiry_year),
        }
        return cls(id=sub.id, data=data, company_id=company_id)


class ChargebeeWebhookLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    data = db.Column(JSONB, nullable=False)
