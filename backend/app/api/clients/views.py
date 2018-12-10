from flask import request, abort

from .. import api_bp as api
from ...setup import db
from ..utils import json_response, InvalidAPIRequest
from ...models.clients import Client
from ...decorators import token_required, current_user

from .schemas import ClientSchema


@api.route("/clients", methods=["GET"])
@token_required()
def get_all_clients():
    return json_response({
        "clients": [c.to_json() for c in current_user.company.clients.all()]
    }, 200)


@api.route("/clients", methods=["POST"])
@token_required()
def add_client_by_name():
    json, errors = ClientSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    client = Client.get_or_create_by_name(json["name"], current_user.company_id)
    return json_response({"client": client.to_json()}, 201)


@api.route("/clients/<int:client_id>", methods=["DELETE"])
@token_required()
def delete(client_id):
    client = Client.query.get_or_404(client_id)
    if client.company_id != current_user.company_id:
        abort(403)

    client_id = client.id
    db.session.delete(client)
    return json_response({"id": client_id}, 200)


@api.route("/clients/<int:client_id>", methods=["PUT"])
@token_required()
def edit(client_id):
    json, errors = ClientSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    client = Client.query.get_or_404(client_id)
    if client.company_id != current_user.company_id:
        abort(403)

    client.name = json["name"]

    return json_response({"client": client.to_json()}, 200)
