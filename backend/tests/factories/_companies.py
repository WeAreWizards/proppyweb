from datetime import datetime

import factory
import factory.fuzzy

from app.setup import db
from app.models.companies import Company


class CompanyFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Company
        sqlalchemy_session = db.session

    name = factory.Faker("company")
    created_at = datetime.utcnow()

    @factory.post_generation
    def post(obj, created, extracted, **kwargs):
        db.session.add(obj)
        db.session.commit()
