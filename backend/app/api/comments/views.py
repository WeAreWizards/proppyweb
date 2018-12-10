from flask import request

from .. import api_bp as api
from ...decorators import (
    current_user, shared_proposal, shared_pages_auth,
)
from ...models.shared_comments import SharedComment, SharedCommentThread
from ...models.shared_blocks import SharedBlock
from ...setup import db
from ..utils import json_response, InvalidAPIRequest
from .schemas import SharedCommentSchema
from ...utils.mailer import send_new_client_comments_email


@api.route("/shared/<string:share_uid>/comments", methods=["POST"])
@shared_pages_auth()
@shared_proposal()
def post_comment_on_shared(share_uid, shared):
    json, errors = SharedCommentSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    username = current_user.username if current_user else json["username"]
    # current_user is None is false, even when current_user is actually None
    # I blame witches and werkzeug.local.LocalProxy
    from_client = False if current_user else True

    if "thread_id" in json:
        thread = SharedCommentThread.query.filter_by(
            id=json["thread_id"],
            shared_proposal_id=shared.id,
            resolved=False
        ).first_or_404()
    else:
        thread = SharedCommentThread(
            shared_proposal_id=shared.id,
            block_uid=str(json["block_uid"]),
            block_id=SharedBlock.query.filter_by(uid=str(json["block_uid"])).first_or_404().id
        )
    c = SharedComment(
        username=username,
        comment=json["comment"],
        from_client=from_client
    )
    thread.comments.append(c)
    db.session.add(thread)
    db.session.commit()

    # 3 is the id of the company we use for the example proposals
    # Do not send notification emails on example proposals
    if from_client and shared.proposal.company_id != 3:
        kwargs = {
            "client": c.username,
            "title": shared.title,
            "share_uid": shared.proposal.share_uid,
            "comment": c.comment
        }
        send_new_client_comments_email(
            to=shared.proposal.company.get_team_emails(),
            **kwargs
        )
        shared.proposal.company.do_proposal_comment_integrations(shared, c.comment, username)

    return json_response({"threads": [x.to_json() for x in shared.comment_threads]}, 201)
