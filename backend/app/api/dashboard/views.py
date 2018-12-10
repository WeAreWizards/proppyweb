from flask import abort

from .. import api_bp as api

from ...setup import db

from ..utils import json_response
from ...models.shared_proposals import SharedProposal
from ...models.proposals import Proposal
from ...models.clients import Client
from ...models.users import User
from ...models.blocks import Block
from ...decorators import token_required, current_user
from ...utils.tokens import get_random_string
from ...utils.mixpanel import mp


PROPOSAL_TEMPLATES = [
    {"uid": "LQROVRA4Y", "title": "Mobile app"},
    {"uid": "V5GR5H90B", "title": "Drupal website"},
    {"uid": "0FBR51C3Y", "title": "WordPress website"},
    {"uid": "PJML23QAI", "title": "Book proposal"},
    {"uid": "5BN1DRBIM", "title": "Startup copywriting proposal"},
]


@api.route("/dashboard", methods=["GET"])
@token_required()
def dashboard():
    proposals = Proposal.query.filter_by(company_id=current_user.company_id)
    clients = Client.query.filter_by(company_id=current_user.company_id)
    users = User.query.filter_by(company_id=current_user.company_id)

    return json_response({
        "proposals": [x.to_json() for x in proposals],
        "clients": [x.to_json() for x in clients],
        "users": [x.to_json() for x in users],
        "templates": PROPOSAL_TEMPLATES,
    }, 200)


@api.route("/templates/<string:share_uid>/duplicate", methods=["POST"])
@token_required()
def duplicate_template(share_uid):
    shared = SharedProposal.get_latest_by_share_uid(share_uid)
    if not shared or share_uid not in [t["uid"] for t in PROPOSAL_TEMPLATES]:
        abort(404)

    proposal = Proposal()
    proposal.title = shared.title
    proposal.company_id = current_user.company_id
    proposal.share_uid = get_random_string()

    for block in shared.blocks:
        proposal.blocks.append(Block(block.type, data=block.data, ordering=block.ordering))

    db.session.add(proposal)
    db.session.commit()
    mp.track(current_user.company_id, "Template duplicated", {"name": proposal.title})

    return json_response({"proposal": proposal.to_json()}, 201)
