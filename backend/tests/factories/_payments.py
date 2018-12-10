from datetime import datetime
import factory
import time


from app.setup import db
from app.models.payments import ChargebeeSubscriptionCache
from ._companies import CompanyFactory


class ChargebeeSubscriptionCacheFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = ChargebeeSubscriptionCache
        sqlalchemy_session = db.session

    # TODO: figure out why id is needed explicitely
    id = 0
    company = factory.SubFactory(CompanyFactory)
    created_at = datetime.utcnow()
    data = {
        "sub_id": "erer",
        "plan_id": "basic",
        "status": "in_trial",
        "trial_end": int(time.time()) + 86400,
        "current_term_start": int(time.time()) - 86400,
        "current_term_end": int(time.time()) + 86400,
        "card_status": "valid",
        "card_type": "visa",
        "card_last4": "1111",
        "card_expiry": "10/2017",
    }

    @factory.post_generation
    def post(obj, created, extracted, **kwargs):
        db.session.add(obj)
        db.session.commit()
