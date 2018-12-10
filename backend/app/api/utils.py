from sqlalchemy.exc import DatabaseError
from flask import jsonify, current_app

from . import api_bp as api
from ..setup import db
from ..decorators import JWTError


class InvalidAPIRequest(Exception):
    status_code = 400

    def __init__(self, status_code=None, payload=None):
        Exception.__init__(self)
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        return rv


@api.errorhandler(InvalidAPIRequest)
def handle_invalid_usage(error):
    response = jsonify({"errors": error.to_dict()})
    response.status_code = error.status_code
    current_app.logger.info("STATUS 400: %s", response)
    return response


@api.app_errorhandler(404)
def page_not_found(e):
    response = jsonify({})
    response.status_code = 404
    return response


@api.app_errorhandler(403)
def unauthorized(e):
    response = jsonify({})
    response.status_code = 403
    return response


@api.app_errorhandler(500)
def internal_error(e):
    response = jsonify({})
    response.status_code = 500
    # Always rollback on 500 to avoid persisting connections
    # with errors as 500 skip the session_commit middleware
    db.session.rollback()
    return response


@api.errorhandler(JWTError)
def handle_unauthorized(error):
    response = jsonify({})
    response.status_code = error.status_code
    return response


def json_response(payload, status_code=200):
    response = jsonify(payload)
    response.status_code = status_code
    return response


@api.after_request
def session_commit(response):
    if response.status_code >= 400:
        return response

    try:
        db.session.commit()
    except DatabaseError:
        db.session.rollback()
        raise

    return response
