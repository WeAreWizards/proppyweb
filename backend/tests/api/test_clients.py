from tests.common import DatabaseTest
from tests.factories._users import UserFactory
from tests.factories._clients import ClientFactory
from tests.factories._proposals import ProposalFactory


class TestClients(DatabaseTest):
    def setUp(self):
        super(TestClients, self).setUp()
        self.user = UserFactory()
        self.c = ClientFactory(company=self.user.company)
        self.p = ProposalFactory(company=self.user.company, client=self.c)

    def test_get_all_clients(self):
        response, status_code = self.get_json("/clients", user=self.user)
        self.assertEqual(status_code, 200)
        self.assertEqual(len(response["clients"]), 1)

    def test_add_client_by_name(self):
        response, status_code = self.post_json("/clients", {"name": "ACME"}, user=self.user)
        self.assertEqual(status_code, 201)
        clients = self.user.company.clients.all()
        self.assertEqual(len(clients), 2)
        clients = [x for x in clients if x.name == "ACME"]
        self.assertEqual(clients[0].name, "ACME")

    def test_delete_a_client_with_no_proposal(self):
        client = ClientFactory(company=self.user.company)
        response = self.delete("/clients/{}".format(client.id), user=self.user)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.user.company.clients.count(), 1)

    def test_deleting_a_client_with_proposals(self):
        response = self.delete("/clients/{}".format(self.c.id), user=self.user)
        self.assertEqual(response.status_code, 200)
        clients = self.user.company.clients.all()
        self.assertEqual(len(clients), 0)
        # It shouldn't delete attached proposals
        self.assertEqual(self.user.company.proposals.count(), 1)
        self.assertIsNone(self.p.client)
