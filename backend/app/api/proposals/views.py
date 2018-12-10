import logging
import datetime

from flask import request, abort
from pyquery import PyQuery as pq

from .. import api_bp as api
from ...setup import db
from ...utils import signalling
from ..utils import json_response, InvalidAPIRequest
from ...utils.exceptions import AuthException
from ...models.blocks import Block
from ...models.clients import Client
from ...models.companies import PublishState
from ...models.enums import ProposalStatus
from .schemas import StatusSchema, UpdateProposalSchema, ImportSectionSchema
from ...decorators import token_required, proposal_owner_required, current_user
from ...utils.tokens import get_random_string
from ...utils.search import find
from ...utils.mixpanel import mp
from . import internal_api

from typing import List

LOG = logging.getLogger(__name__)


def get_proposal_data(proposal):
    tags = [] # type: List[str]
    for p in proposal.company.proposals.all():
        tags += p.tags

    return {
        "proposal": proposal.to_json(),
        "users": [u.to_json(get_token=False) for u in proposal.company.users.all()],
        "blocks": [b.to_json() for b in proposal.blocks.order_by(Block.ordering).all()],
        "client": proposal.client.to_json() if proposal.client_id else {},
        "clients": [x.to_json() for x in proposal.company.clients.all()],
        "tags": list(set(tags)),
        # "threads": [x.to_json() for x in proposal.comment_threads],
        "company": proposal.company.to_json(),
    }


@api.route("/proposals", methods=["POST"])
@token_required()
def create_empty_proposal():
    proposal = internal_api.create_empty_proposal(current_user.company)

    return json_response({"proposal": proposal.to_json()}, 201)


@api.route("/proposals/<int:proposal_id>", methods=["GET"])
@token_required()
@proposal_owner_required()
def get_proposal(proposal):
    proposal_data = get_proposal_data(proposal)
    if proposal_data["proposal"]["title"] == "Start here!":
        mp.track(current_user.company_id, "Opened Start Here")
    return json_response(proposal_data, 200)


# TODO: split in 2: metadata and blocks
@api.route("/proposals/<int:proposal_id>", methods=["PUT"])
@token_required()
@proposal_owner_required()
def put_proposal(proposal):
    if proposal.is_signed() or proposal.status == "won":
        raise InvalidAPIRequest()

    data, errors = UpdateProposalSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    proposal.title = data["title"]
    proposal.tags = data["tags"]
    proposal.cover_image_url = data["cover_image_url"]
    proposal.updated_at = datetime.datetime.utcnow()

    client_id = data.get("client_id")
    client_name = data.get("client_name")
    if client_id is not None:
        client = Client.query.filter_by(
            id=client_id, company_id=proposal.company_id
        ).first()
        if client is None:
            raise InvalidAPIRequest(payload="Client not found")

        proposal.client_id = client_id
    if client_name is not None:
        client = Client.get_or_create_by_name(client_name.strip(), proposal.company_id)
        proposal.client_id = client.id

    if client_name is None and client_id is None:
        proposal.client_id = None

    # And now blocks saving
    current = set(x[0] for x in proposal.blocks.values(Block.uid))
    new = set()

    for i, x in enumerate(data.get("blocks", [])):
        # str conversion important because set difference will fail otherwise:
        new.add(str(x["uid"]))
        db.session.merge(Block(
            x["type"],
            x["proposal_id"],
            uid=str(x["uid"]),
            version=x["version"],
            data=x["data"],
            ordering=i,
        ))

    # Instead of deleting we set the proposal id to null. block can
    # then be restored by the merge above. Note that we need to fetch
    # (synchronize_session=fetch) all data because sqlalchemy isn't
    # clever enough to figure out what changes with a SQL-only update.
    removed = current - new
    if removed:
        Block.query.filter(Block.uid.in_(removed)).update({"proposal_id": None}, synchronize_session="fetch")

    return json_response(get_proposal_data(proposal), 200)


@api.route("/proposals/<int:proposal_id>/status", methods=["PUT"])
@token_required()
@proposal_owner_required()
def change_status(proposal):
    """
    Force change of status. The proposal may have a different status in the real world.
    """
    if proposal.is_signed():
        raise InvalidAPIRequest()

    json, errors = StatusSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    active_status = [ProposalStatus.Draft.value, ProposalStatus.Sent.value]
    # Changing from a non-active to active status, we need to check if we can
    publish_state = current_user.company.can_add_new_active_proposal()
    if (
        json["status"] in active_status
        and proposal.status not in active_status
        and publish_state != PublishState.CAN_PUBLISH
    ):
        return json_response({"publishState": publish_state.value}, 402)

    proposal.status = json["status"]
    proposal.changed_status_at = datetime.datetime.utcnow()

    signalling.SIGNAL.PROPOSAL_MOVED_TO.send(company=proposal.company, payload={ # type: ignore
        "id": proposal.id,
        "title": proposal.title,
        "status": proposal.status,
    })
    return json_response(get_proposal_data(proposal), 200)


@api.route("/proposals/<int:proposal_id>", methods=["DELETE"])
@token_required()
@proposal_owner_required()
def delete_permanently(proposal):
    """
    Delete a proposal but only it it was already in the trash
    """
    if proposal.status != ProposalStatus.Trash.value or proposal.is_signed():
        raise InvalidAPIRequest()
    prop_id = proposal.id
    db.session.delete(proposal)

    return json_response({"id": prop_id}, 200)


@api.route("/proposals/<int:proposal_id>/duplicate", methods=["POST"])
@token_required()
@proposal_owner_required()
def duplicate(proposal):
    copied = proposal.duplicate()
    copied.share_uid = get_random_string()
    db.session.add(copied)
    mp.track(current_user.company_id, "Proposal duplicated")

    signalling.SIGNAL.PROPOSAL_DUPLICATED.send(company=proposal.company, payload={ # type: ignore
        "id": copied.id,
        "title": copied.title,
    })

    return json_response({"proposal": copied.to_json()}, 201)


@api.route("/proposals/sections/search", methods=["GET"])
@token_required()
def section_search():
    """
    Query ES for the most likely results
    """
    q = request.args.get("q", "")
    proposal_id = request.args.get("id", "")
    if q == "" or proposal_id == "":
        return json_response({})

    results = []
    for hit in find(q, current_user.company_id, proposal_id):
        summary = ""
        if "title" in hit.meta.highlight:
            # Repeating the title when finding a title is not very useful
            summary = hit.content
        elif "content" in hit.meta.highlight:
            summary = hit.meta.highlight.content[0]

        results.append({
            "uid": hit.meta.id,
            "level": hit.level,
            "proposalTitle": hit.proposal_title,
            "title": hit.title,
            "summary": summary,
        })

    return json_response({"results": results})


@api.route("/proposals/<int:proposal_id>/sections/import", methods=["POST"])
@token_required()
@proposal_owner_required()
def import_section(proposal):
    json, errors = ImportSectionSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    try:
        blocks = proposal.get_import_section_blocks(str(json['uidToImport']))
    except AuthException:
        abort(403)

    mp.track(current_user.company_id, "Section imported")

    return json_response({"blocks": [x.to_json() for x in blocks]}, 200)


@api.route("/proposals/embed", methods=["GET"])
@token_required()
def embed_api():
    # Takes a url like a soundclound page and returns the url to embed
    url = request.args.get("url")
    if not url:
        return json_response({}, 400)

    # Grab that page HTML
    try:
        page = pq(url)
    except Exception as e:  # who knows what can happen
        return json_response({}, 400)

    embed_url = url
    if url.startswith("https://soundcloud.com"):
        embed_url = page("meta[property='twitter:player']").attr("content")

    return json_response({"url": embed_url}, 200)


@api.route("/analytics/<int:proposal_id>", methods=["GET"])
@token_required()
@proposal_owner_required()
def get_analytics(proposal):
    mp.track(current_user.company_id, "Analytics viewed")
    return json_response({
        "me": current_user.to_json(),
        "proposal": proposal.to_json(),
        "data": proposal.get_analytics_data(),
    }, 200)
