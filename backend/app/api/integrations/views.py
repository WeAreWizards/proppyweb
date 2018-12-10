import logging

from flask import request, current_app, render_template
from slackclient import SlackClient
import requests


from .. import api_bp as api
from ...setup import db
from ..utils import json_response, InvalidAPIRequest
from ...models.clients import Client
from ...models.integrations import (
    SlackIntegration, InsightlyIntegration, ZohoCRMIntegration, PipedriveIntegration,
    ContactsIntegration, StripeIntegration,
)
from ...utils.integrations import (
    get_insightly_contacts, get_pipedrive_contacts, get_zoho_contacts, IntegrationAuthFailed
)
from ...models.companies import Company
from ...decorators import token_required, current_user
from .schemas import SlackEvents, IntegrationToken, RemoveIntegrationToken
from ...utils.mixpanel import mp

from typing import List, Dict, Any


@api.route("/slack_oauth", methods=["GET"])
def slack_oauth():
    code = request.args["code"]
    company_id = int(request.args["state"])
    sc = SlackClient("")
    # Request the auth tokens from Slack
    auth_response = sc.api_call(
        "oauth.access",
        client_id=current_app.config["SLACK_CLIENT_ID"],
        client_secret=current_app.config["SLACK_CLIENT_SECRET"],
        code=code
    )

    s = SlackIntegration(
        token=auth_response["access_token"],
        team_name=auth_response["team_name"],
        channel=auth_response["incoming_webhook"]["channel"],
        webhook_url=auth_response["incoming_webhook"]["url"],
    )
    c = Company.query.get_or_404(company_id)
    c.slack = s
    db.session.add(c)
    db.session.commit()
    mp.track(company_id, "Slack added")

    return render_template("oauth_done.html"), 200


@api.route("/stripe_oauth", methods=["GET"])
def stripe_oauth():
    code = request.args["code"]
    company_id = int(request.args["state"])
    error = request.args.get("error")
    # What to do if Stripe fails?
    if error is not None:
        return render_template("oauth_done.html"), 400

    data = {
        "grant_type": "authorization_code",
        "client_id": current_app.config["STRIPE_CLIENT_ID"],
        "client_secret": current_app.config["STRIPE_SECRET_KEY"],
        "code": code
    }

    c = Company.query.get_or_404(company_id)
    response = requests.post("https://connect.stripe.com/oauth/token", params=data).json()

    s = StripeIntegration(
        token_type=response["token_type"],
        stripe_publishable_key=response["stripe_publishable_key"],
        scope=response["scope"],
        livemode=response["livemode"],
        stripe_user_id=response["stripe_user_id"],
        refresh_token=response["refresh_token"],
        access_token=response["access_token"],
    )
    c.stripe = s
    db.session.add(c)
    db.session.commit()
    mp.track(company_id, "Stripe added")

    return render_template("oauth_done.html"), 200


@api.route("/slack_oauth", methods=["DELETE"])
@token_required()
def remove_slack():
    current_user.company.slack = None
    mp.track(current_user.company_id, "Slack removed")
    return json_response({
        "company": current_user.company.to_json()
    }, 200)


@api.route("/stripe_oauth", methods=["DELETE"])
@token_required()
def remove_stripe():
    current_user.company.stripe = None
    mp.track(current_user.company_id, "Stripe removed")
    return json_response({
        "company": current_user.company.to_json()
    }, 200)


@api.route("/slack_oauth", methods=["PUT"])
@token_required()
def update_slack_events():
    data, errors = SlackEvents().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    current_user.company.slack.post_on_view = data["post_on_view"]
    current_user.company.slack.post_on_comment = data["post_on_comment"]
    current_user.company.slack.post_on_signature = data["post_on_signature"]
    db.session.add(current_user.company.slack)

    return json_response({
        "company": current_user.company.to_json()
    }, 200)


@api.route("/add_integration_token", methods=["POST"])
@token_required()
def add_integration_token():
    data, errors = IntegrationToken().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    # TODO: test api endpoint
    contacts = [] # type: List[Dict[str, Any]]
    clients = [] # type: List[Dict[str, Any]]
    try:
        if data["name"] == "zohocrm":
            contacts, clients = get_zoho_contacts(data["token"])
            current_user.company.zoho_crm = ZohoCRMIntegration(auth_token=data["token"])
            mp.track(current_user.company_id, "ZohoCRM added")
        elif data["name"] == "insightly":
            contacts, clients = get_insightly_contacts(data["token"])
            current_user.company.insightly = InsightlyIntegration(api_key=data["token"])
            mp.track(current_user.company_id, "Insightly added")
        elif data["name"] == "pipedrive":
            contacts, clients = get_pipedrive_contacts(data["token"])
            current_user.company.pipedrive = PipedriveIntegration(api_token=data["token"])
            mp.track(current_user.company_id, "Pipedrive added")
        elif data["name"] == "stripe":
            current_user.company.stripe = StripeIntegration(token=data["token"])
            mp.track(current_user.company_id, "Stripe added")
    except IntegrationAuthFailed:
        raise InvalidAPIRequest(payload={'error': "The authentication token didn't work. Please check that it is correct."})
    except Exception as e:
        logging.exception("Failed to fetch contacts from %s upload failed: %s", data["name"], e)
        raise InvalidAPIRequest(payload={})

    current_user.company.integration_contacts.append(
        ContactsIntegration(source=data["name"], contacts=contacts)
    )
    for client in clients:
        current_user.company.clients.append(
            Client(name=client["name"], source=data["name"], source_id=client["id"])
        )

    db.session.add(current_user.company)

    return json_response({
        "company": current_user.company.to_json()
    }, 200)


@api.route("/remove_integration_token", methods=["POST"])
@token_required()
def remove_integration_token():
    data, errors = RemoveIntegrationToken().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    if data["name"] == "zohocrm":
        current_user.company.zoho_crm = None
        mp.track(current_user.company_id, "ZohoCRM removed")
    elif data["name"] == "insightly":
        current_user.company.insightly = None
        mp.track(current_user.company_id, "Insightly removed")
    elif data["name"] == "pipedrive":
        current_user.company.pipedrive = None
        mp.track(current_user.company_id, "Pipedrive removed")

    current_user.company.delete_clients_from_integration(data["name"])
    db.session.add(current_user.company)

    return json_response({
        "company": current_user.company.to_json()
    }, 200)


@api.route("/integration_contacts", methods=["GET"])
@token_required()
def get_integration_contacts():
    contacts = {
        c["source"]: c["contacts"]
        for c in [c.to_json() for c in current_user.company.integration_contacts]
    }

    return json_response({
        "contacts": contacts
    }, 200)
