from datetime import datetime

import factory
import factory.fuzzy

from app.setup import db
from app.models.proposals import Proposal
from app.models.blocks import BlockType, Block
from app.utils.tokens import get_random_string

from ._companies import CompanyFactory
from ._clients import ClientFactory


class ProposalFactory(factory.alchemy.SQLAlchemyModelFactory):
    class Meta:
        model = Proposal
        sqlalchemy_session = db.session

    title = factory.Faker("sentence", nb_words=4)
    share_uid = factory.LazyAttribute(lambda x: get_random_string())
    tags = []
    company = factory.SubFactory(CompanyFactory)
    client = factory.SubFactory(ClientFactory)
    created_at = factory.LazyAttribute(lambda x: datetime.utcnow())
    updated_at = factory.LazyAttribute(lambda x: datetime.utcnow())
    cover_image_url = ""
    status = "draft"

    @factory.post_generation
    def post(obj, created, extracted, **kwargs):
        db.session.add(obj)
        db.session.commit()


class DefaultProposalFactory(ProposalFactory):
    """A proposal with a section + paragraph blocks"""

    @factory.post_generation
    def post(obj, created, extracted, **kwargs):
        section = Block(BlockType.Section.value, None, data={'value': 'Introduction'}, ordering=0)
        paragraph = Block(BlockType.Paragraph.value, None, data={'value': 'hello'}, ordering=1)
        obj.blocks.append(section)
        obj.blocks.append(paragraph)
        db.session.add(obj)
        db.session.commit()
