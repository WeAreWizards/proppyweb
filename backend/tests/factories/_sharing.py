import datetime
import uuid

import factory
import factory.fuzzy
import json

from app.setup import db
from app.models.shared_proposals import SharedProposal
from app.models.shared_blocks import SharedBlock
from app.models.signatures import Signature
from app.models.analytics import Event
from ._proposals import DefaultProposalFactory


class SharedProposalFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = SharedProposal
        sqlalchemy_session = db.session

    proposal = factory.SubFactory(DefaultProposalFactory)
    version = factory.Sequence(lambda n: n)
    sent_to = []
    title = ""

    @factory.post_generation
    def post(obj, created, extracted, **kwargs):
        for x in obj.proposal.blocks:
            obj.blocks.append(SharedBlock.from_proposal_block(x))
        obj.title = obj.proposal.title
        db.session.add(obj)
        db.session.commit()


class SignatureFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Signature
        sqlalchemy_session = db.session

    document = json.dumps({})
    keyczar_signature = ""
    proposal = factory.SubFactory(DefaultProposalFactory)
    shared_proposal = factory.SubFactory(SharedProposalFactory)


class EventFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Event
        sqlalchemy_session = db.session

    user_uid = factory.LazyFunction(uuid.uuid4)
    kind = "load"
    data = {}
    shared_proposal = factory.SubFactory(SharedProposalFactory)
    created_at = factory.LazyFunction(datetime.datetime.utcnow)
