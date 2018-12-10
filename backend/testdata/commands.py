from faker import Faker
from flask_script import Command

from app import setup
from app.models.companies import Company
from app.api.dashboard.views import PROPOSAL_TEMPLATES

from tests.factories._users import UserFactory
from tests.factories._companies import CompanyFactory
from tests.factories._proposals import DefaultProposalFactory
from tests.factories._sharing import SharedProposalFactory


f = Faker()


class CoolAgencyCommand(Command):
    """(re)creates a test agency"""

    def run(self):
        """
        The data here is as mix of randomized and hardcoded to
        capture a few corner cases (long names etc).
        """
        db = setup.db

        for table in reversed(db.metadata.sorted_tables):
            db.engine.execute(table.delete())

        company = CompanyFactory(name="A Cool Agency")
        user = UserFactory(id=None, company=company, email="me@cool-agency.com", is_admin=True)
        db.session.add(user)
        db.session.commit()

        # we generate proposals with share uids of the templates so we can test
        # duplication locally
        for i in range(4):
            title = "Proposal for %s" % f.company()
            p = DefaultProposalFactory(
                company=company,
                title=title,
                client=None,
                share_uid=PROPOSAL_TEMPLATES[i]["uid"]
            )
            db.session.add(p)
            s = SharedProposalFactory(proposal=p, version=1)
            db.session.add(s)

        # Super long title
        p = DefaultProposalFactory(
            company=company,
            title="long " * 12,
            client=None,
        )
        db.session.add(p)

        db.session.commit()
