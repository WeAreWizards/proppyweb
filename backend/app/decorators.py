from functools import wraps

from flask import request, _request_ctx_stack, abort
from werkzeug.local import LocalProxy

from .models.users import User
from .models.shared_proposals import SharedProposal
from .utils.tokens import decode_jwt
from .models.proposals import Proposal


# So i don't really know what _request_ctx_stack.top is (name makes it easy to guess though)
# This part is taken from flask-jwt
current_user = LocalProxy(lambda: getattr(_request_ctx_stack.top, 'current_user', None))


class JWTError(Exception):
    def __init__(self, error, description, status_code=401):
        self.error = error
        self.description = description
        self.status_code = status_code

    def __repr__(self):
        return 'JWTError: %s' % self.error


def _check_jwt(allow_anon=False):
    """Actual implementation of the token_required decorator"""
    token_header = request.headers.get('Authorization', None)
    if token_header is None and allow_anon:
        return

    if token_header is None or not token_header.startswith("Bearer "):
        raise JWTError("Missing Token", "No token or invalid token in Auth header")

    token = token_header[7:]
    success, claims = decode_jwt(token_header[7:])
    if not success:
        raise JWTError("Invalid token", "Token was: %s" % token)

    user = User.query.get(claims["user"]) # type: ignore
    if user is None:
        raise JWTError("User not found", "User id was: %d" % claims["user"])  # type: ignore

    _request_ctx_stack.top.current_user = user


def token_required():
    """The decorator to use when wanting to restrict an endpoint"""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            _check_jwt()
            if current_user.disabled:
                abort(403)

            return fn(*args, **kwargs)
        return decorator
    return wrapper


def shared_pages_auth():
    """Same as token_required but allows anon users as well (used in shared page)"""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            _check_jwt(allow_anon=True)
            return fn(*args, **kwargs)
        return decorator
    return wrapper


def proposal_owner_required():
    """
    Use when the first URL argument is a proposal_id and the proposal
    has to belong to the current user's company.
    """
    from .api.utils import InvalidAPIRequest

    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            proposal_id = kwargs.pop('proposal_id')
            proposal = Proposal.query.get_or_404(proposal_id)
            if proposal.company_id != current_user.company_id:
                raise InvalidAPIRequest(status_code=403)
            return fn(proposal, *args, **kwargs)
        return decorator
    return wrapper


def shared_proposal():
    """
    Used on views from a shared proposal to ensure the proposal is shared and
    get the latest version
    """
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            share_uid = kwargs.pop("share_uid")
            version = kwargs.pop("version", None)
            if version is None:
                shared = SharedProposal.get_latest_by_share_uid(share_uid)
            else:
                shared = SharedProposal.get_by_share_uid_and_version(share_uid, version)

            if not shared:
                abort(404)
            return fn(share_uid, shared, *args, **kwargs)
        return decorator
    return wrapper
