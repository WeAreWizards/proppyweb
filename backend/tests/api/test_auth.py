from tests.common import DatabaseTest
from tests.factories._users import UserFactory
from tests.factories._proposals import DefaultProposalFactory
from tests.factories._clients import ClientFactory


class TestAuth(DatabaseTest):
    def setUp(self):
        super(TestAuth, self).setUp()
        self.user = UserFactory()
        self.user2 = UserFactory()
        self.other_company = self.user2.company
        self.p = DefaultProposalFactory(company=self.other_company, client=None)

    def test_cant_get_other_company_proposal(self):
        response = self.get("/proposals/{}".format(self.p.id), user=self.user)

        self.assertEqual(response.status_code, 403)

    def test_cant_edit_other_company_proposal(self):
        _, status_code = self.put_json("/proposals/{}".format(self.p.id), {
            "title": "hello",
            "tags": []
        }, user=self.user)
        self.assertEqual(status_code, 403)

    def test_cant_share_other_company_proposal(self):
        _, status_code = self.post_json(
            "/proposals/{}/share".format(self.p.id), {"emails": ["a@a.com"]}, user=self.user
        )
        self.assertEqual(status_code, 403)

    def test_cant_delete_other_company_client(self):
        client = ClientFactory(company=self.other_company)
        response = self.delete("/clients/{}".format(client.id), self.user)
        self.assertEqual(response.status_code, 403)

    def test_cant_edit_other_company_client(self):
        client = ClientFactory(company=self.other_company)
        _, status_code = self.put_json("/clients/{}".format(client.id), {"name": "ACME"}, self.user)
        self.assertEqual(status_code, 403)

    def test_cant_import_other_company_section(self):
        p_new = DefaultProposalFactory()
        uid = p_new.blocks.filter_by(type='section').first().uid

        with self.assertRaises(Exception):
            self.p.get_import_section_blocks(uid)

        # Check API level as well.
        data, status_code = self.post_json(
            "/proposals/{}/sections/import".format(self.p.id),
            {"uidToImport": uid},
            user=self.user
        )

        # We're not cat
        self.assertEqual(status_code, 403)

    def test_cant_do_anything_while_disabled(self):
        user = UserFactory(disabled=True, company=self.other_company)

        # any request should 403
        response = self.get("/proposals/{}".format(self.p.id), user=user)
        self.assertEqual(response.status_code, 403)

    def test_can_access_during_trial(self):
        user = UserFactory(activation_token=b'dasdsad', company=self.other_company)
        # any request should 200
        response = self.get("/proposals/{}".format(self.p.id), user=user)
        self.assertEqual(response.status_code, 200)
