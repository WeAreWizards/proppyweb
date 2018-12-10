import factory
import factory.fuzzy

from app.setup import db
from app.models.clients import Client

from ._companies import CompanyFactory


class ClientFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Client
        sqlalchemy_session = db.session

    name = factory.Faker("company")
    contacts = []
    company = factory.SubFactory(CompanyFactory)

    @factory.post_generation
    def post(obj, created, extracted, **kwargs):
        db.session.add(obj)
        db.session.commit()
