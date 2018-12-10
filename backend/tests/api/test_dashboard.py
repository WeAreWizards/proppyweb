from tests.common import DatabaseTest
from tests.factories._users import UserFactory
from tests.factories._proposals import ProposalFactory
from tests.factories._companies import CompanyFactory
from tests.factories._sharing import SharedProposalFactory


class TestTemplates(DatabaseTest):
    def setUp(self):
        super(TestTemplates, self).setUp()
        self.user = UserFactory()
        self.waw = CompanyFactory()
        # share_uid needs to be one from dashboard/views list
        self.template = ProposalFactory(
            title="Template", share_uid="LQROVRA4Y", company=self.waw
        )

    def test_can_duplicate_template(self):
        self.shared = SharedProposalFactory(proposal=self.template, title=self.template.title)
        _, status = self.post_json(
            "/templates/{}/duplicate".format(self.template.share_uid),
            {},
            user=self.user
        )
        self.assertEqual(status, 201)

        company_proposals = self.user.company.proposals.all()

        self.assertEqual(1, len(company_proposals))
        self.assertEqual(company_proposals[0].title, self.template.title)

    def test_cannot_duplicate_any_random_shared_proposal(self):
        proposal = ProposalFactory(company=self.waw)
        self.shared = SharedProposalFactory(proposal=proposal)

        _, status = self.post_json(
            "/templates/{}/duplicate".format(proposal.share_uid),
            {},
            user=self.user
        )
        self.assertEqual(status, 404)
