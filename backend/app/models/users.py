import sqlalchemy

from enum import Enum
from datetime import datetime, timezone

from flask import current_app
from sqlalchemy.dialects.postgresql import BYTEA

from ..setup import db, bcrypt
from ..utils.tokens import create_expiring_jwt

from .companies import PublishState


class CIText(sqlalchemy.types.Concatenable, sqlalchemy.types.UserDefinedType):
    """
    Case-insensitive text comparison.

    See https://www.postgresql.org/docs/9.4/static/citext.html
    """
    def __init__(self):
        super() # type: ignore

    def get_col_spec(self):
        return 'CITEXT'

    def bind_processor(self, dialect):
        def process(value):
            return value
        return process

    def result_processor(self, dialect, coltype):
        def process(value):
            return value
        return process


class TokenType(Enum):
    Login = "login"
    Activation = "activation"
    Reset = "reset"


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False, index=True)

    # Email and username are case-insensitive to avoid double
    # subscribes and other confusion.
    username = db.Column(CIText(), nullable=False)
    email = db.Column(CIText(), unique=True, nullable=False)
    password = db.Column(BYTEA(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    activation_token = db.Column(BYTEA, nullable=False)
    reset_password_token = db.Column(BYTEA, default=b'', nullable=False)
    disabled = db.Column(db.Boolean, default=False, nullable=False)
    onboarded = db.Column(db.Boolean, default=False, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    # Dump the raw utm data on signup. We can make sense of it in a
    # separate step.
    utm_source = db.Column(db.String(256), nullable=False, default="not-set")

    welcome_email_sent = db.Column(db.Boolean, default=False, nullable=False)
    trial_end_email_sent = db.Column(db.Boolean, default=False, nullable=False)

    def __repr__(self):
        return '<User %r>' % self.email

    @staticmethod
    def normal_signup(username, email, password, utm_source):
        user = User(username=username, email=email, utm_source=utm_source)
        user.set_password(password)
        user.set_activation_token()
        user.is_admin = True
        return user

    @staticmethod
    def get_by_activation_token(token):
        return User.query.filter_by(activation_token=bytes(token, "utf-8")).first()

    @staticmethod
    def get_by_reset_password_token(token):
        return User.query.filter_by(reset_password_token=bytes(token, "utf-8")).first()

    @property
    def is_active(self) -> bool:
        """Returns true if the email has been validated."""
        return self.activation_token == b''

    def set_activation_token(self):
        self.activation_token = self.generate_jwt(
            TokenType.Activation, current_app.config["ACTIVATION_PERIOD_EXPIRY"]
        )

    def set_password(self, password):
        self.password = bcrypt.generate_password_hash(password)

    def verify_password(self, password) -> bool:
        return bcrypt.check_password_hash(self.password, password)

    def set_reset_password_token(self):
        self.reset_password_token = self.generate_jwt(
            TokenType.Reset,
            current_app.config["RESET_PASSWORD_PERIOD_EXPIRY"]
        )

    def generate_jwt(self, token_type, expires_in) -> bytes:
        claims = {
            "user": self.id,
            "company": self.company_id,
            "type": token_type.value
        }

        # We need the company name for invited users
        # Company will be None the first time around as it isn't saved yet
        if token_type == TokenType.Activation and self.company is not None:
            claims.update({"companyName": self.company.name})

        return create_expiring_jwt(
            claims,
            expires_in
        )

    def publish_state(self) -> PublishState:
        """Returns whether the user is allowed to publish a proposal or not"""
        if not self.is_active:
            return PublishState.USER_INACTIVE_CANNOT_PUBLISH

        return self.company.publish_state()

    def to_json(self, get_token=True):
        """Data sent to the frontend for that user"""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "isAdmin": self.is_admin,
            "isActive": self.is_active,
            "publishState": self.publish_state().value,
            "companyId": self.company_id,
            "disabled": self.disabled,
            "onboarded": self.onboarded,
            "createdAt": int(self.created_at.replace(tzinfo=timezone.utc).timestamp()),
            "loginToken": self.generate_jwt(
                TokenType.Login, current_app.config["LOGIN_PERIOD_EXPIRY"]
            ).decode("utf-8") if get_token else "",
        }

    def to_public_json(self):
        """Used on the published proposal to avoid leaking data"""
        return {
            "id": self.id,
            "username": self.username,
        }


class Unsubscribed(db.Model):
    __tablename__ = 'unsubscribed'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(CIText(), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
