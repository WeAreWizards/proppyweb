from marshmallow import (
    Schema, fields, validate, validates, ValidationError, post_load
)

from ...models.users import User, TokenType
from ...utils.tokens import decode_jwt
from typing import Tuple, Union, Any


def _validate_token(value, token_type):
    user = None
    if token_type == TokenType.Activation:
        user = User.get_by_activation_token(value)
    elif token_type == TokenType.Reset:
        user = User.get_by_reset_password_token(value)

    if user is None:
        raise ValidationError("Token not found")

    success, data = decode_jwt(value)
    if success:
        return

    if data == "expired":
        raise ValidationError("Token has expired")
    if data == "issuer" or data == "decode" or data["type"] != token_type.value: # type: ignore
        raise ValidationError("Invalid token")


class FirstUserSignupSchema(Schema):
    username = fields.String(required=True, validate=[validate.Length(min=1, max=64)])
    email = fields.Email(required=True, validate=[validate.Length(min=4, max=255)])
    password = fields.String(required=True, validate=[validate.Length(min=8, max=255)])
    company_name = fields.String(required=True, load_from="companyName")
    utm_source = fields.String(required=False)

    @validates("email")
    def validate_email(self, value):
        if User.query.filter_by(email=value).count() > 0:
            raise ValidationError("Email already in use")


class InvitedUserSignupSchema(Schema):
    username = fields.String(required=True, validate=[validate.Length(min=1, max=64)])
    password = fields.String(required=True, validate=[validate.Length(min=8, max=255)])
    token = fields.String(required=True)

    @validates("token")
    def validate_token(self, value):
        _validate_token(value, TokenType.Activation)


class RequestPasswordResetSchema(Schema):
    email = fields.Email(required=True, validate=[validate.Length(min=1, max=255)])

    @validates("email")
    def validate_email(self, value):
        if User.query.filter_by(email=value).count() == 0:
            raise ValidationError("Email not in the database")

    @post_load
    def get_user(self, data):
        return User.query.filter_by(email=data["email"]).first()


class ResetPasswordSchema(Schema):
    password = fields.String(required=True, validate=[validate.Length(min=8, max=255)])
    token = fields.String(required=True)

    @validates("token")
    def validate_token(self, value):
        _validate_token(value, TokenType.Reset)


class LoginSchema(Schema):
    password = fields.String(required=True, validate=[validate.Length(min=8, max=255)])
    email = fields.Email(required=True)

    @validates("email")
    def validate_email(self, value):
        if User.query.filter_by(email=value).count() == 0:
            raise ValidationError("Email not in the database")


class InviteUserSchema(Schema):
    email = fields.Email(required=True, validate=[validate.Length(min=1, max=255)])

    @validates("email")
    def validate_email(self, value):
        if User.query.filter_by(email=value).count() > 0:
            raise ValidationError("Email already in use")


class InactiveEmailSchema(Schema):
    email = fields.Email(required=True, validate=[validate.Length(min=1, max=255)])

    @validates("email")
    def validate_email(self, value):
        user = User.query.filter_by(email=value).first()
        if user is None:
            raise ValidationError("User doesn't exist")
        if user.is_active:
            raise ValidationError("User is already active")

    @post_load
    def get_user(self, data):
        return User.query.filter_by(email=data["email"]).first()


class UpdatePasswordSchema(Schema):
    currentPassword = fields.String(required=True, validate=[validate.Length(min=8, max=255)])
    newPassword = fields.String(required=True, validate=[validate.Length(min=8, max=255)])


class UpdateAccountSchema(Schema):
    displayName = fields.String(required=True, validate=[validate.Length(min=1, max=255)])
