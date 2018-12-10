import factory
import factory.fuzzy

from app.setup import db
from app.models.users import User, TokenType
from ._companies import CompanyFactory


class UserFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = User
        sqlalchemy_session = db.session

    username = factory.Faker("name")
    email = factory.Faker("email")
    # password is "password" with secret key "secret"
    password = b'$2b$04$M48pC2ApL3Jg5980Atbeg.oM0qy.Jbi0SKK68HMoDrmOfqfmFs8.u'
    is_admin = False
    activation_token = b''
    company = factory.SubFactory(CompanyFactory)
    disabled = False
    trial_end_email_sent = False

    @factory.post_generation
    def post(obj, created, extracted, **kwargs):
        db.session.add(obj)
        db.session.commit()


class InvitedUserFactory(UserFactory):
    password = b''

    @factory.post_generation
    def post(obj, created, extracted, **kwargs):
        obj.activation_token = obj.generate_jwt(TokenType.Activation, 3600)
        InvitedUserFactory._meta.sqlalchemy_session.add(obj)
        InvitedUserFactory._meta.sqlalchemy_session.commit()


class ResetPasswordUserFactory(UserFactory):
    @factory.post_generation
    def post(obj, created, extracted, **kwargs):
        obj.set_reset_password_token()
        InvitedUserFactory._meta.sqlalchemy_session.add(obj)
        InvitedUserFactory._meta.sqlalchemy_session.commit()
