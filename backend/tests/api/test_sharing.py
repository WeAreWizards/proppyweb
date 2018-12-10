from datetime import datetime, timedelta
from app.setup import mail

from tests.common import DatabaseTest
from tests.factories._payments import ChargebeeSubscriptionCacheFactory
from tests.factories._users import UserFactory
from tests.factories._proposals import ProposalFactory
from tests.factories._clients import ClientFactory
from tests.factories._sharing import SharedProposalFactory, SignatureFactory


class TestSharing(DatabaseTest):
    def setUp(self):
        super(TestSharing, self).setUp()
        self.user = UserFactory()
        self.c = ClientFactory(company=self.user.company)
        self.p = ProposalFactory(company=self.user.company, client=self.c)
        self.url = "/proposals/{}/share".format(self.p.id)
        self.email_url = "/proposals/{}/share-email".format(self.p.id)
        self.sent_url = "/proposals/{}/mark-as-sent".format(self.p.id)
        self.email = {
            "emails": ["a@a.com", "a@a.com"],
            "from": "Me",
            "subject": "Hello",
            "body": "Yolo %s" % self.p.share_uid,
        }

    def test_basic_sharing_works(self):
        with mail.record_messages() as outbox:
            _, status = self.post_json(self.url, {}, user=self.user)
            self.assertEqual(status, 200)
            self.assertEqual(self.p.shared_proposals.count(), 1)
            self.assertEqual(len(outbox), 0)

    def test_email_share_proposal(self):
        SharedProposalFactory(version=1, proposal=self.p)
        with mail.record_messages() as outbox:
            _, status = self.post_json(
                    self.email_url, self.email, user=self.user
            )

            self.assertEqual(status, 200)
            self.assertEqual(self.p.shared_proposals.count(), 1)
            shared = self.p.shared_proposals.first()
            self.assertEqual(shared.version, 1)
            self.assertEqual(shared.blocks.count(), self.p.blocks.count())
            self.assertEqual(len(outbox), 1)
            self.assertIn(self.p.share_uid, outbox[0].body)
            self.assertIn("Yolo", outbox[0].body)
            self.assertEqual(len(self.p.client.contacts), 1)
            self.assertEqual(self.p.client.contacts[0], "a@a.com")
            self.assertEqual(shared.subject, self.email["subject"])
            self.assertEqual(shared.from_name, self.email["from"])
            self.assertEqual(shared.body, self.email["body"])

    def test_email_share_proposal_no_duplicate_contacts(self):
        SharedProposalFactory(version=1, proposal=self.p)
        with mail.record_messages() as outbox:
            self.c.contacts = ["a@a.com"]
            _, status = self.post_json(
                    self.email_url, self.email, user=self.user
            )
            self.assertEqual(status, 200)
            self.assertListEqual(sorted(list(outbox[0].send_to)), sorted(["a@a.com", self.user.email]))
            self.assertEqual(len(self.p.client.contacts), 1)

    def test_share_mark_as_sent(self):
        SharedProposalFactory(version=1, proposal=self.p)
        self.assertEqual(self.p.status, "draft")
        _, status = self.post_json(self.sent_url, {}, user=self.user)
        self.assertEqual(status, 200)
        self.assertEqual(self.p.status, "sent")

    def test_cant_share_if_signed(self):
        shared = SharedProposalFactory(version=1, proposal=self.p)
        SignatureFactory(proposal=self.p, shared_proposal=shared)
        _, code = self.post_json("/shared/%s/sign" % self.p.share_uid, {})

        self.assertEqual(code, 400)

    def test_cant_share_if_email_unverified(self):
        self.p.status = "lost"
        self.user.activation_token = b'not-empty-means-not-verified'
        _, status = self.post_json(self.url, {}, user=self.user)
        self.assertEqual(status, 402)

    def test_can_share_draft_if_at_limit_for_plan(self):
        self.user.company.created_at = datetime.utcnow() - timedelta(days=60)
        ChargebeeSubscriptionCacheFactory(company=self.user.company)
        # Creating 4 sent proposals
        for _ in range(0, 4):
            SharedProposalFactory(
                version=1,
                proposal=ProposalFactory(company=self.user.company, status="sent")
            )
        _, status = self.post_json(self.url, {}, user=self.user)
        self.assertEqual(status, 200)


class TestAccessSharedProposal(DatabaseTest):
    def setUp(self):
        super(TestAccessSharedProposal, self).setUp()
        self.user = UserFactory()
        self.p = ProposalFactory(company=self.user.company)
        self.shared = SharedProposalFactory(proposal=self.p)
        self.url = "/shared/{}".format(self.p.share_uid)

    def test_access_404(self):
        _, status = self.get_json("/shared/42")
        self.assertEqual(status, 404)

    def test_access_proposal_not_shared(self):
        p = ProposalFactory(company=self.user.company)
        _, status = self.get_json("/shared/{}".format(p.share_uid))
        self.assertEqual(status, 404)

    def test_access_anonymous(self):
        data, status = self.get_json(self.url)

        self.assertEqual(status, 200)
        self.assertEqual(self.shared.to_json(), data["shared"])

    def test_access_logged_in(self):
        data, status = self.get_json(self.url, user=self.user)

        self.assertEqual(status, 200)
        self.assertEqual(self.shared.to_json(), data["shared"])

    def test_get_latest_version(self):
        shared2 = SharedProposalFactory(proposal=self.p, version=self.shared.version + 1)
        data, status = self.get_json(self.url, user=self.user)

        self.assertEqual(status, 200)
        self.assertEqual(data["shared"]["version"], shared2.version)
