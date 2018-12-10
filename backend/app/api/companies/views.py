from functools import wraps
import json

from flask import request, Response

from .schemas import BrandingUpdateSchema
from .fonts import FONTS

from .. import api_bp as api
from ..utils import InvalidAPIRequest, json_response
from ...decorators import token_required, current_user
from .schemas import CompanySchema
from ...models.payments import trial_subscription
from ...models.companies import DEFAULT_BRANDING
from ...utils.mixpanel import mp
from ...utils.dump_company import dump_company


@api.route("/companies/us", methods=["GET"])
@token_required()
def us():
    team = current_user.company.users.all()
    sub = current_user.company.subscription_cache

    return json_response({
        "users": [u.to_json() for u in team],
        "company": current_user.company.to_json(),
        "subscription": trial_subscription(current_user.company) if sub is None else sub.to_json(),
    }, 200)


@api.route("/companies/us", methods=["POST"])
@token_required()
def update_us():
    data, errors = CompanySchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    current_user.company.name = data['companyName']
    current_user.company.currency = data['currency']
    if "logoUrl" in data:
        current_user.company.logo_url = data['logoUrl']
    # Update mixpanel in case we updated the company name so it always
    # reflects the current one
    mp.people_set(current_user.company_id, {
       "companyName": current_user.company.name,
    })
    return json_response({
        "company": current_user.company.to_json()
    }, 200)


@api.route("/companies/us", methods=["PUT"])
@token_required()
def update_logo():
    current_user.company.logo_url = request.json['logoUrl']

    return json_response({
        "company": current_user.company.to_json()
    }, 200)


@api.route("/companies/available-fonts", methods=["GET"])
@token_required()
def get_available_fonts():
    return json_response({
        "fonts": FONTS,
    }, 200)


@api.route("/companies/branding", methods=["POST"])
@token_required()
def update_our_branding():
    data, errors = BrandingUpdateSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    current_user.company.branding = data["branding"]

    mp.track(current_user.company_id, "Updated Branding", {
        "default": data["branding"] == DEFAULT_BRANDING,
    })

    return json_response({
        "company": current_user.company.to_json()
    }, 200)


def check_auth(username, password):
    """This function is called to check if a username /
    password combination is valid.
    """
    # Avochoc
    return username == '662' and password == 'se1&2khy4Q5A'


def authenticate():
    """Sends a 401 response that enables basic auth"""
    return Response(
    'Could not verify your access level for that URL.\n'
    'You have to login with proper credentials', 401,
    {'WWW-Authenticate': 'Basic realm="Login Required"'})
