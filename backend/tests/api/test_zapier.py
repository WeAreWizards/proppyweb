import datetime

from tests.common import DatabaseTest
from tests.factories._users import UserFactory
from tests.factories._proposals import DefaultProposalFactory
from tests.factories._clients import ClientFactory

from app.setup import db
from app.models.zapier import ZapierIntegration


class TestCase(DatabaseTest):
    def setUp(self):
        super().setUp()
        self.user = UserFactory()
        self.integration = ZapierIntegration(company_id=self.user.company.id)
        db.session.add(self.integration)
        db.session.commit()

    def test_create_proposal(self):
        self.assertEqual(self.user.company.proposals.count(), 0)
        _, status_code = self.post_json(
            "/zapier/action/create_proposal", {}, extra_headers={"Authorization": "api_key={}".format(self.integration.api_key)}
        )
        self.assertEqual(status_code, 200)

        self.assertEqual(self.user.company.proposals.count(), 1)


    def test_create_proposal_with_title(self):
        self.assertEqual(self.user.company.proposals.count(), 0)
        _, status_code = self.post_json(
            "/zapier/action/create_proposal", {"title": "halloumi"}, extra_headers={"Authorization": "api_key={}".format(self.integration.api_key)}
        )
        self.assertEqual(status_code, 200)

        self.assertEqual(self.user.company.proposals.count(), 1)
