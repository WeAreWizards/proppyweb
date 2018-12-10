import logging
from functools import wraps
import flask
from ...setup import db
from .. import api_bp as api
from ...decorators import token_required, current_user
from ...models.zapier import ZapierIntegration, ZapierHookEndpoint
from ...models.proposals import Proposal
from ..utils import InvalidAPIRequest, json_response
from . import schemas
from app.api.proposals import internal_api


def auth_header_required(f):
    """
    Look up auth header and insert integration as first argument.

    "Authorization": "api_key={{api_key}}"
    """
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth = flask.request.headers['Authorization']
        name, _, api_key = auth.partition('=')
        if name != 'api_key':
            return json_response({"errors": "invalid auth header"}, 400)
        integration = ZapierIntegration.query.filter_by(api_key=api_key).first()
        if integration is None:
            logging.info("Invalid API key %r", api_key)
            return json_response({"errors": "not authorized"}, 403)
        return f(integration, *args, **kwargs)
    return wrapper


@api.route('/zapier/api_key', methods=['POST'])
@token_required()
def zapier_api_key():
    integration = ZapierIntegration(company_id=current_user.company.id)
    db.session.add(integration)
    db.session.commit()

    return json_response({
        "company": current_user.company.to_json(),
    }, 200)


@api.route('/zapier/api_key', methods=['DELETE'])
@token_required()
def zapier_api_key_delete():
    z = ZapierIntegration.query.filter_by(company_id=current_user.company.id).first()
    db.session.delete(z)
    db.session.commit()

    return json_response({
        "company": current_user.company.to_json(),
    }, 200)


@api.route('/zapier/subscription', methods=['POST'])
@auth_header_required
def zapier_subscribe(integration):
    """
    This is called when people switch a Zap from off to on and it contains some JSON like this:

    {'target_url': 'https://zapier.com/hooks/standard/2031907/119a62f76c524976a0d0dd46217cebfb/',
     'subscription_url': 'https://zapier.com/hooks/standard/2031907/119a62f76c524976a0d0dd46217cebfb/',
     'event': 'proposal_created',
    }

    The docs say `subscription_url` is for backwards compatability so we ignore it and store
    target_url for the event and company.
    """
    subscribe, errors = schemas.Subscribe().load(flask.request.json)
    if errors or subscribe is None:
        raise InvalidAPIRequest(payload=errors)

    company = integration.company

    # NB that there is no unique constraint on events - each new zap gets its
    # own endpoint URL.
    endpoint = ZapierHookEndpoint(
        company_id=company.id,
        zapier_integration_id=integration.id,
        target_url=subscribe['target_url'],
        event=subscribe['event'],
    )
    db.session.add(endpoint)
    db.session.commit()

    return json_response({"id": endpoint.id})


@api.route('/zapier/subscription/<id>', methods=['DELETE'])
@auth_header_required
def zapier_unsubscribe(integration, id):
    # TODO this is not tested, zapier doesn't seem to call this despite what
    # the API docs say.
    endpoint = ZapierHookEndpoint.query.get_or_404(id)
    db.session.delete(endpoint)

    return json_response({})


@api.route('/zapier/polling/<event>', methods=['GET'])
@auth_header_required
def zapier_polling(integration, event):
    """
    public zapier adds need to support polling so users can test
    their zaps during the zap creation phase.

    I initially thought we needed a real proposal for testing but doesn't
    look that way. I.e. we don't need special handling for when people
    delete all their proposals.
    """
    if event == "proposal_created":
        proposal = integration.company.proposals.order_by(Proposal.id.desc()).first()
        if proposal is None:
            logging.warning("zapier: unexpectedly no data for %r, event %r", integration.company, event)
            return json_response({"error": "No data for event {}".format(event)}, 400)
        return json_response([{'id': proposal.id}])

    elif event == "proposal_moved_to":
        proposal = integration.company.proposals.order_by(Proposal.updated_at.desc()).first()
        if proposal is None:
            logging.warning("zapier: unexpectedly no data for %r, event %r", integration.company, event)
            return json_response({"error": "No data for event {}".format(event)}, 400)
        return json_response([{
            'id': proposal.id,
            'status': proposal.status,
            'title': proposal.title,
        }])

    elif event == "proposal_published":
        proposal = integration.company.proposals.order_by(Proposal.updated_at.desc()).first()
        if proposal is None:
            logging.warning("zapier: unexpectedly no data for %r, event %r", integration.company, event)
            return json_response({"error": "No data for event {}".format(event)}, 400)
        shared = proposal.get_latest_shared()
        if shared is None:
            logging.warning("zapier: unexpectedly no shared proposal for %r, event %r", integration.company, event)
            return json_response({"error": "No shared proposal: {}".format(event)}, 400)
        return json_response([{
            'id': shared.id,
            'version': shared.version,
            'title': shared.title,
            'link': proposal.get_share_link(),
        }])

    else:
        logging.warning("zapier: unknown event event %r", event)
        return json_response({"error": "Unknown event: {}".format(event)}, 400)


@api.route('/zapier/action/create_proposal', methods=['POST'])
@auth_header_required
def zapier_create_proposal(integration):
    data, errors = schemas.CreateProposal().load(flask.request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    internal_api.create_empty_proposal(integration.company, title=data.get("title", ""))

    return json_response({})
