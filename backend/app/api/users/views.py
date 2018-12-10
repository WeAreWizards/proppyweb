import uuid
import sqlalchemy
import logging


from flask import request, current_app, redirect, render_template

from .. import api_bp as api
from .schemas import (
    FirstUserSignupSchema,
    InvitedUserSignupSchema,
    RequestPasswordResetSchema,
    ResetPasswordSchema,
    LoginSchema,
    InviteUserSchema,
    InactiveEmailSchema,
    UpdatePasswordSchema,
    UpdateAccountSchema,
)
from ..utils import InvalidAPIRequest, json_response
from ...models.companies import Company
from ...models.users import User, Unsubscribed
from ...onboarding.start_proposal import create_welcome_proposal
from ...setup import db
from ...utils.tokens import decode_jwt
from ...utils.mailer import (
    send_activation_email,
    send_password_reset_email,
    send_team_invite_email,
)
from ...decorators import token_required, current_user
from ...utils.mixpanel import mp


@api.route("/users", methods=["POST"])
def first_user_signup():
    data, errors = FirstUserSignupSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    company = Company(name=data["company_name"])
    db.session.add(company)
    db.session.commit()
    user = User.normal_signup(
        data["username"],
        data["email"],
        data["password"],
        utm_source=data.get("utm_source"),
    )

    company.users.append(user)
    create_welcome_proposal(company.id)
    db.session.commit()

    if current_app.config["PRODUCTION"]:
        print("SLACK: New user + company: `{}` `{}`".format(user.email, company.name), flush=True)

    send_activation_email(
        user.email,
        token=user.activation_token.decode("utf-8"),
        username=user.username
    )
    return json_response({"user": user.to_json()}, 201)


@api.route("/resend-activation-email", methods=["POST"])
def resend_activation_email():
    user, errors = InactiveEmailSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    send_activation_email(
        user.email,
        token=user.activation_token.decode("utf-8"),
        username=user.username
    )
    return json_response({}, 200)


@api.route("/users", methods=["GET"])
@token_required()
def get_team():
    team = current_user.company.users.all()
    return json_response({"users": [u.to_json() for u in team]}, 200)


@api.route("/invites", methods=["POST"])
@token_required()
def invite_team_member():
    data, errors = InviteUserSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)
    user = User(
        email=data["email"],
        company_id=current_user.company_id,
        username="",
        activation_token=b""
    )
    # Good luck logging in
    user.set_password(str(uuid.uuid4()))
    db.session.add(user)
    db.session.commit()
    # Ok so we re-create the proper activation token now that the user is saved
    # and has access to the associated company
    user.set_activation_token()

    send_team_invite_email(
        user.email,
        token=user.activation_token.decode("utf-8"),
        username=current_user.username,
        company=current_user.company.name,
    )
    mp.track(user.company_id, "Invited user")

    return json_response({"user": user.to_json()}, 201)


@api.route("/resend-invite", methods=["POST"])
@token_required()
def resend_invite_mail():
    user, errors = InactiveEmailSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    if user.company_id != current_user.company_id:
        # TODO: put the current user in the marshmallow schema
        return json_response({}, 404)

    # Tokens expire so re-set the token.
    user.set_activation_token()
    send_team_invite_email(user.email, token=user.activation_token.decode("utf-8"))
    return json_response({}, 200)


@api.route("/invited-users", methods=["POST"])
def invited_user_signup():
    data, errors = InvitedUserSignupSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    user = User.get_by_activation_token(data["token"])
    user.set_password(data["password"])
    user.username = data["username"]
    user.activation_token = b''
    db.session.add(user)

    if current_app.config["PRODUCTION"]:
        print("SLACK: Invited user signup: `{}` for company `{}`".format(user.email, user.company.name), flush=True)
        mp.track(user.company_id, "Invited user signed up")

    return json_response({"user": user.to_json()}, 200)


@api.route("/activate/<string:token>", methods=["POST"])
def activate(token):
    user = User.get_by_activation_token(token)
    if user is None:
        raise InvalidAPIRequest(payload={"error": "Token not found"})

    user.activation_token = b''

    return json_response({}, 200)


@api.route("/request-reset-password", methods=["POST"])
def request_reset_password():
    user, errors = RequestPasswordResetSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    user.set_reset_password_token()
    db.session.add(user)
    db.session.commit()

    send_password_reset_email(
        user.email,
        token=user.reset_password_token.decode("utf-8"),
        username=user.username,
    )
    return json_response({}, 200)


@api.route("/reset-password", methods=["POST"])
def reset_password():
    data, errors = ResetPasswordSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    user = User.get_by_reset_password_token(data["token"])
    user.reset_password_token = b''
    user.set_password(data["password"])
    db.session.add(user)

    return json_response({}, 200)


@api.route("/me", methods=["GET"])
@token_required()
def me():
    return json_response(current_user.to_json(), 200)


@api.route("/tokens", methods=["POST"])
def login():
    data, errors = LoginSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    user = User.query.filter_by(email=data["email"]).first()
    if not user.verify_password(data["password"]):
        return json_response({"errors": {"password": ["Invalid password"]}}, 401)

    return json_response({"user": user.to_json()}, 201)


@api.route("/users/update-password", methods=["POST"])
@token_required()
def update_password():
    data, errors = UpdatePasswordSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    if not current_user.verify_password(data["currentPassword"]):
        raise InvalidAPIRequest(payload={"currentPassword": ["Invalid password"]})

    current_user.set_password(data["newPassword"])
    # TODO - reset JWT token because people might reset their password
    # for security reasons. I.e. we want to log out all other logged
    # in clients.

    return json_response({}, 200)


@api.route("/users/update-account", methods=["POST"])
@token_required()
def update_account():
    data, errors = UpdateAccountSchema().load(request.json)
    if errors:
        raise InvalidAPIRequest(payload=errors)

    current_user.username = data['displayName'] # type: ignore

    return json_response({"user": current_user.to_json()}, 200)


@api.route("/disable-user/<int:user_id>", methods=["POST"])
@token_required()
def disable_user(user_id):
    """We don't delete users, we just disable them"""
    user = User.query.get_or_404(user_id)
    if not current_user.is_admin or user.company != current_user.company:
        raise InvalidAPIRequest()

    user.disabled = True

    return json_response({"user": user.to_json()}, 200)


@api.route("/enable-user/<int:user_id>", methods=["POST"])
@token_required()
def enable_user(user_id):
    """We don't delete users, we just disable them"""
    user = User.query.get_or_404(user_id)
    if not current_user.is_admin or user.company != current_user.company:
        raise InvalidAPIRequest()

    user.disabled = False
    return json_response({"user": user.to_json()}, 200)


@api.route("/toggle-user-admin/<int:user_id>", methods=["POST"])
@token_required()
def toggle_user_admin_status(user_id):
    """Toggle admin-normal user status"""
    user = User.query.get_or_404(user_id)
    if not current_user.is_admin or user.company != current_user.company:
        raise InvalidAPIRequest()

    # Can't un-admin the only admin
    if current_user.company.get_number_admin_users() == 1 and user == current_user:
        raise InvalidAPIRequest()

    user.is_admin = not user.is_admin
    return json_response({"user": user.to_json()}, 200)


@api.route("/finish-onboarding", methods=["POST"])
@token_required()
def finish_onboarding():
    current_user.onboarded = True # type: ignore
    mp.track(current_user.company_id, "Onboarding done", {"User ID": current_user.id})
    return json_response({"user": current_user.to_json()}, 200)


@api.route("/unsubscribe", methods=["GET", "POST"])
def unsubscribe():
    token = request.args.get("token")
    ok, token = decode_jwt(token)

    if not ok:
        logging.warning("invalid unsubscribe token used {}".format(token))
        return redirect('/')

    email = token.get('email')

    if not email:
        logging.warning("invalid unsubscribe token used {}".format(token))
        return redirect('')

    if request.method == "POST":
        try:
            db.session.add(Unsubscribed(email=email))
        except sqlalchemy.exc.IntegrityError:
            pass
        return redirect('https://www.google.co.uk/search?q=cat+goodbye&source=lnms&tbm=isch&sa=X&biw=1280&bih=706&dpr=2')

    return render_template(
        "unsubscribe.html",
        token=token,
        email=email,
    )
