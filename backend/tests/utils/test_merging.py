from app.utils.merge_companies import merge_companies

from tests.common import DatabaseTest
from tests.factories._proposals import DefaultProposalFactory
from tests.factories._users import UserFactory
from tests.factories._clients import ClientFactory


class MergeTest(DatabaseTest):
    def setUp(self):
        super().setUp()
        self.proposal1 = DefaultProposalFactory()
        self.proposal2 = DefaultProposalFactory()

        self.company2 = self.proposal2.company

        self.proposal1.company.users.append(UserFactory())
        self.proposal2.company.users.append(UserFactory())

        self.proposal1.company.clients.append(ClientFactory())
        self.proposal2.company.clients.append(ClientFactory())

        print(self.proposal1.company.users.all())
        print(self.proposal2.company)

    def test_merge(self):
        self.assertEqual(self.proposal1.company.users.count(), 1)
        self.assertEqual(self.proposal1.company.clients.count(), 1)
        self.assertEqual(self.proposal1.company.proposals.count(), 1)

        merge_companies(self.proposal1.company.id, self.proposal2.company.id)

        self.assertEqual(self.proposal1.company.users.count(), 2)
        self.assertEqual(self.proposal1.company.clients.count(), 2)
        self.assertEqual(self.proposal1.company.proposals.count(), 2)

        self.assertEqual(self.company2.users.count(), 0)
        self.assertEqual(self.company2.clients.count(), 0)
        self.assertEqual(self.company2.proposals.count(), 0)
