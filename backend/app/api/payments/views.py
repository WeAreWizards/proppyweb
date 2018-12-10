import logging
from datetime import timezone

import chargebee
from flask import request, current_app, abort

from .. import api_bp as api
from ..utils import InvalidAPIRequest, json_response
from ...models.payments import ChargebeeSubscriptionCache, ChargebeeWebhookLog, trial_subscription
from ...setup import db
from ...decorators import token_required, current_user
from .schemas import SubscribeSchema, InvoiceDownloadSchema
from ...utils.mixpanel import mp


# TODO disable subscription stuff when email not verified


# We're rewriting the webhook from a random URL in nginx to this:
@api.route("/chargebee-webhooks", methods=["POST"])
def chargebee_webhook():
    data = request.json
    event_type = data["event_type"]

    wh_log = ChargebeeWebhookLog(data=data)
    db.session.add(wh_log)
    logging.info("Received webhook event_type: %s: %r", event_type, data)

    company_id = None
    if event_type in ["subscription_created", "subscription_activated",  "subscription_reactivated", "subscription_renewed",
                      "subscription_cancelled", "subscription_changed"]:
        company_id = data["content"]["card"]["customer_id"]

    if event_type in ["card_updated", "card_added", "card_expired", "card_deleted"]:
        company_id = data["content"]["card"]["customer_id"]

    if company_id is not None:
        sub = ChargebeeSubscriptionCache.refetch(company_id)
        db.session.merge(sub)
        if event_type == "subscription_created":
            mp.track(company_id, "Paid signup", {"plan": sub.data["plan_id"]})
        logging.info("invalidated customer %s", company_id)

    return "", 200


@api.route("/chargebee-fetch-subscription", methods=["GET"])
@token_required()
def chargebee_fetch_subscription():
    cached = current_user.company.subscription_cache
    if cached is None:
        return json_response({"subscription": trial_subscription(current_user.company)})

    return json_response({"subscription": cached.to_json()})


@api.route("/chargebee-fetch-subscription-sync", methods=["GET"])
@token_required()
def chargebee_fetch_subscription_sync():
    """
    Sync fetching required directly after signup.
    """
    sub = ChargebeeSubscriptionCache.refetch(current_user.company.id)
    if sub is None:
        return json_response({"subscription": trial_subscription(current_user.company)})

    db.session.merge(sub)
    return json_response({"subscription": sub.to_json()})


@api.route("/chargebee-new-hosted-page", methods=["POST"])
@token_required()
def get_new_hosted_page_url():
    data, errors = SubscribeSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    # ie admin signing up and trying to pay without activating their account
    # it should be disabled on the frontend as well
    expiry_ts = current_user.company.get_trial_expiry_timestamp()
    number_users = current_user.company.get_active_users_number()

    # we can't charge 0 user so return an error in that case
    if number_users == 0:
        raise InvalidAPIRequest(payload={
            "error": "You need at least one active user to subscribe."
        })

    try:
        hosted_page = chargebee.HostedPage.checkout_new({
            "subscription": {
                "plan_id": data["plan"],
                # If the trial end is in the past then we pass 0.
                # Chargebee docs:
                # > If '0' is passed, the subscription will be activated immediately.
                "trial_end": 0 if current_user.company.trial_has_ended() else expiry_ts,
            },
            "customer": {
                "id": current_user.company.id,
                "first_name": current_user.username,
                "company": current_user.company.name,
                "email": current_user.email,
            },
            "embed": True,
            "iframe_messaging": True,
        }).hosted_page

    except chargebee.api_error.InvalidRequestError as e:
        # The chargebee webhook callback can fail for several reasons,
        # leaving us with an account on chargebee but no account in
        # our DB. We detect this and call the card update instead.
        if 'already has a subscription' in e.args[0]:
            return get_update_payment_hosted_page_url()

        logging.error("chargebee error: %s", e)
        raise InvalidAPIRequest(payload={"error": "Payment error. Please contact team@proppy.io"})

    return json_response({
        "url": hosted_page.url,
        "id": hosted_page.id,
        "siteName": current_app.config["CHARGEBEE_SITE"]
    })


@api.route("/chargebee-update-hosted-page", methods=["POST"])
@token_required()
def get_update_payment_hosted_page_url():
    try:
        hosted_page = chargebee.HostedPage.update_payment_method({
            "customer": {
                "id": current_user.company.id
            },
            "embed": True,
            "iframe_messaging": True,
        }).hosted_page
    except chargebee.api_error.InvalidRequestError as e:
        logging.error("chargebee error: %s", e)
        raise InvalidAPIRequest(payload={"error": "Payment error. Please contact team@proppy.io"})

    return json_response({
        "url": hosted_page.url,
        "id": hosted_page.id,
        "siteName": current_app.config["CHARGEBEE_SITE"]
    })


@api.route("/chargebee-change-plan", methods=["POST"])
@token_required()
def change_plan():
    data, errors = SubscribeSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    # get current plan for subscription id
    sub = ChargebeeSubscriptionCache.refetch(current_user.company.id)
    if sub is None:
        raise InvalidAPIRequest(payload={"error": "Payment error. Please contact team@proppy.io"})

    try:
        expiry_date = current_user.company.get_trial_expiry_date()
        result = chargebee.Subscription.update(sub.id, {
            "plan_id": data["plan"],
            "trial_end": 0 if current_user.company.trial_has_ended() else int(expiry_date.replace(tzinfo=timezone.utc).timestamp()),
        }).subscription

    except chargebee.api_error.InvalidRequestError as e:
        logging.error("chargebee error: %s", e)
        raise InvalidAPIRequest(payload={"error": "Payment error. Please contact team@proppy.io"})

    except chargebee.api_error.PaymentError as e:
        logging.error("chargebee payment error: %s", e)
        raise InvalidAPIRequest(payload={"error": "Payment error. Please contact team@proppy.io"})

    old_plan = sub.data["plan_id"]
    sub.data["plan_id"] = result.plan_id
    db.session.merge(sub)
    mp.track(current_user.company_id, "Plan Changed", {
        "Old": old_plan,
        "New": result.plan_id
    })

    return json_response({"subscription": sub.to_json()})


@api.route("/chargebee-get-invoices", methods=["GET"])
@token_required()
def get_all_invoices():
    sub = current_user.company.subscription_cache
    if not sub:
        return json_response({"invoices": []})

    invoices = sub.get_all_invoices()

    return json_response({"invoices": [i.values for i in invoices]})


@api.route("/chargebee-download-invoice", methods=["POST"])
@token_required()
def download_invoice():
    data, errors = InvoiceDownloadSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    invoice_id = data["invoice_id"]
    sub = current_user.company.subscription_cache
    if not sub or not sub.is_invoice_from_sub(invoice_id):
        abort(404)

    response = chargebee.Invoice.pdf(invoice_id)
    return json_response({"url": response.download.download_url})


@api.route("/chargebee-cancel", methods=["POST"])
@token_required()
def cancel():
    sub = current_user.company.subscription_cache
    if not sub:
        raise InvalidAPIRequest()

    if sub and not sub.can_cancel():
        raise InvalidAPIRequest()

    chargebee.Subscription.cancel(sub.data["sub_id"], params={"end_of_term": True})

    if current_app.config["PRODUCTION"]:
        print("SLACK: User `{}` cancelled company `{}` plan: `{}`, Feedback: `{}`".format(
            current_user.email,
            current_user.company.name,
            sub.to_json(),
            request.json.get("feedback", ""),
        ), flush=True)
        mp.track(current_user.company_id, "Sub Cancelled", {
            "plan": sub.data["plan_id"],
        })

    sub = ChargebeeSubscriptionCache.refetch(current_user.company.id)
    db.session.merge(sub)

    return json_response({"subscription": sub.to_json()})
