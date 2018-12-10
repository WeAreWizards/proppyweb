import logging
import threading
import requests
import datetime
import calendar
import json

from flask import request, current_app
import geoip2.database
import stripe

from .. import api_bp as api
from ...setup import db
from ...utils import signalling
from ..utils import json_response, InvalidAPIRequest
from ...models.enums import ProposalStatus
from ...models.shared_blocks import SharedBlock
from ...models.shared_proposals import SharedProposal, WAW_IPS
from ...models.signatures import Signature
from ...models.companies import PublishState
from ...models.analytics import Event
from .schemas import ShareSchema, SigningSchema
from ...decorators import (
    token_required, proposal_owner_required, shared_proposal, current_user,
    shared_pages_auth
)
from ...utils.mailer import (
    send_proposal_share_email, send_client_signed_email, send_client_paid_email,
)
from ...utils.mixpanel import mp
from typing import List, Dict, Any

LOG = logging.getLogger(__name__)


def get_share_data(shared, shared_uid):
    users = [] # type: List[Dict[str, Any]]
    # Can't use is None because this is a proxy object
    if current_user:
        users = [u.to_public_json() for u in current_user.company.users.all()]

    blocks = [b.to_json() for b in shared.blocks.order_by(SharedBlock.ordering).all()]
    # We use share uid for everything on shared pages
    for block in blocks:
        block["proposalId"] = shared_uid
    return {
        "blocks": blocks,
        "threads": [c.to_json() for c in shared.comment_threads],
        "users": users,
        "company": shared.proposal.company.to_public_json(),
        "shared": shared.to_json(),
        "isLatest": SharedProposal.count_versions(shared_uid) - 1 != shared.version
    }


def generate_pdf(uid, shared):
    pdf_renderer_base_url = current_app.config["PDF_RENDERER_BASE_URL"]

    def pregenerate_pdf(base_url, s):
        try:
            requests.get("{}/{}/{}".format(base_url, uid, s.version))
        except Exception as e:
            logging.warning("pregenerate_pdf failed, ignoring error: %s", e)

    # prefetch and ignore PDF on each share
    threading.Thread(target=pregenerate_pdf, args=(pdf_renderer_base_url, shared, )).start()


ip_db = None


@api.before_app_first_request
def init_geoip_db():
    global ip_db
    try:
        ip_db = geoip2.database.Reader(current_app.config["GEOIP_DATABASE_PATH"])
        logging.info("loaded %s", ip_db.metadata())
    except Exception:
        logging.exception("could not load ip_db")


@api.route("/proposals/<int:proposal_id>/share", methods=["POST"])
@token_required()
@proposal_owner_required()
def share_proposal(proposal):
    """
    Freeze current state of a the proposal for sharing.
    """
    # Can't share a signed proposal
    if proposal.is_signed():
        raise InvalidAPIRequest()

    shared = proposal.get_latest_shared()
    active_status = [ProposalStatus.Draft.value, ProposalStatus.Sent.value]
    publish_state = current_user.publish_state()
    if proposal.status not in active_status and publish_state != PublishState.CAN_PUBLISH and shared is None:
        return json_response({"publishState": publish_state.value}, 402)

    shared2 = proposal.create_shared([]) if shared is None else proposal.create_shared(shared.sent_to)

    generate_pdf(proposal.share_uid, shared2)
    mp.track(current_user.company_id, "Proposal shared")

    signalling.SIGNAL.PROPOSAL_PUBLISHED.send(company=proposal.company, payload={ # type: ignore
        'id': shared2.id,
        'version': shared2.version,
        'title': shared2.title,
        'link': proposal.get_share_link(),
    })

    return json_response({}, 200)


@api.route("/proposals/<int:proposal_id>/share-email", methods=["POST"])
@token_required()
@proposal_owner_required()
def email_shared_proposal(proposal):
    """"Users can email the shared proposal after creating the shared one"""
    # Can't share a signed proposal
    if proposal.is_signed():
        raise InvalidAPIRequest()

    data, errors = ShareSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    proposal.status = ProposalStatus.Sent.value
    proposal.changed_status_at = datetime.datetime.utcnow()

    send_to = set(data["emails"])
    shared = proposal.get_latest_shared()
    if not shared:
        raise InvalidAPIRequest()

    if proposal.client and len(send_to) > 0:
        emails = set(proposal.client.contacts) | send_to
        proposal.client.contacts = list(emails)

    data.update({
        "bcc": [current_user.email],
        "replyTo": current_user.email,
        "share_uid": proposal.share_uid,
    })

    shared.subject = data["subject"]
    shared.from_name = data["from_name"]
    shared.body = data["body"]
    shared.sent_to = send_to

    if len(send_to) > 0:
        send_proposal_share_email(list(send_to), **data)
        mp.track(current_user.company_id, "Proposal emailed")

    return json_response({}, 200)


@api.route("/proposals/<int:proposal_id>/mark-as-sent", methods=["POST"])
@token_required()
@proposal_owner_required()
def mark_as_sent(proposal):
    proposal.status = ProposalStatus.Sent.value
    proposal.changed_status_at = datetime.datetime.utcnow()
    mp.track(current_user.company_id, "Proposal marked as sent")

    return json_response({}, 200)


@api.route("/shared/<string:share_uid>", methods=["GET"])
@api.route("/shared/<string:share_uid>/<int:version>", methods=["GET"])
@shared_proposal()
@shared_pages_auth()
def get_shared_proposal(share_uid, shared):
    """This is open to everyone"""
    return json_response(get_share_data(shared, share_uid), 200)


@api.route("/shared/<string:share_uid>/sign", methods=["POST"])
@shared_proposal()
@shared_pages_auth()
def sign(share_uid, shared):
    """This is open to everyone"""
    # Can't re-sign a signed proposal
    if shared.proposal.is_signed():
        raise InvalidAPIRequest()

    # Can't sign a proposal without signature block
    sig_block = shared.get_signature_block()
    if sig_block is None:
        raise InvalidAPIRequest()

    data, errors = SigningSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    doc = shared.get_signing_doc(
        data["signature"], data["name"], request.remote_addr, data["user_agent"]
    )

    encoded_doc = json.dumps(doc)
    signer = current_app.config['KEYCZAR_SIGNER']
    signed_doc = signer.Sign(encoded_doc)

    signature = Signature()
    signature.shared_proposal_id = shared.id
    signature.proposal_id = shared.proposal.id
    signature.document = encoded_doc
    signature.keyczar_signature = signed_doc

    db.session.add(signature)
    now = datetime.datetime.utcnow()

    sig_block.data = {
        "signature": data["signature"],
        "name": data["name"],
        "hash": signed_doc,
        "date": calendar.timegm(now.utctimetuple()),  # close enough to reality
    }
    shared.proposal.status = ProposalStatus.Won.value
    db.session.add(sig_block)

    send_client_signed_email(
        shared.proposal.company.get_team_emails(),
        title=shared.title,
        name=data["name"],
        share_uid=shared.proposal.share_uid,
    )
    generate_pdf(share_uid, shared)
    shared.proposal.company.do_proposal_signature_integrations(shared)
    mp.track(shared.proposal.company.id, "Proposal signed")

    return json_response(get_share_data(shared, share_uid), 200)


@api.route("/shared/<string:share_uid>/stripe_payment", methods=["POST"])
@shared_proposal()
@shared_pages_auth()
def pay_with_stripe(share_uid, shared):
    token = request.json["token"]
    amount = int(request.json["amount"])
    currency = request.json["currency"]

    # Can't pay a proposal without payment block
    pay_block = shared.get_payment_block()
    if pay_block is None:
        raise InvalidAPIRequest()

    stripe.api_key = current_app.config["STRIPE_SECRET_KEY"]
    try:
        charge = stripe.Charge.create(
            amount=amount,
            currency=currency,
            source=token,
            stripe_account=shared.proposal.company.stripe.stripe_user_id,
        )
        new_data = dict(pay_block.data)
        # A bit ugly for the json bits but the easiest path
        new_data["charge"] = json.loads(json.dumps(charge))
        pay_block.data = new_data
        print("hey")
        print(pay_block.data)
        print("--")
    except stripe.CardError as e:
        return json_response({"msg": "Error while processing card: %s" % e.message}, 400)
    except stripe.StripeError as e:
        return json_response({"msg": "Error while paying: %s" % e.message}, 400)

    shared.proposal.status = ProposalStatus.Won.value
    db.session.add(pay_block)
    db.session.commit()
    send_client_paid_email(
        shared.proposal.company.get_team_emails(),
        title=shared.title,
        share_uid=shared.proposal.share_uid,
    )

    mp.track(shared.proposal.company.id, "Proposal paid with Stripe")
    return json_response(get_share_data(shared, share_uid), 200)


@api.route("/analytics/<string:share_uid>", methods=["POST"])
@api.route("/analytics/<string:share_uid>/<int:version>", methods=["POST"])
@shared_proposal()
@shared_pages_auth()
def analytics(share_uid, shared):
    """This is open to everyone"""
    # No analytics once it's signed or localhost
    if shared.proposal.is_signed() or request.remote_addr == "127.0.0.1":
        return json_response({}, 200)

    user_agent = request.headers.get("User-Agent")
    if "Googlebot" in user_agent or "Google Web Preview" in user_agent:
        return json_response({}, 200)

    event = Event(
        user_uid=request.json["event"]["userUid"],
        kind=request.json["event"]["kind"],
        data=request.json["event"]["data"],
    )
    event.data["ip"] = request.remote_addr
    event.data["city"] = ""
    event.data["country"] = ""
    try:
        response = ip_db.city(request.remote_addr)
        event.data["city"] = response.city.name
        event.data["country"] = response.country.name
    except Exception as e:  # it throws when an ip can't be located, like 127.0.0.1
        LOG.warn("IP %s couldn't be located: %s" % (request.remote_addr, e))
        pass

    # Do integrations that do something on proposal viewing
    if event.kind == "load" and request.remote_addr not in WAW_IPS:
        shared.proposal.company.do_proposal_view_integrations(shared, event.data)

    shared.events.append(event)
    db.session.commit()

    return json_response({}, 200)
