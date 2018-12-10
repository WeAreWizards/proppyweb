from app.setup import mail

from app.models.shared_comments import SharedCommentThread

from tests.common import DatabaseTest
from tests.factories._users import UserFactory
from tests.factories._proposals import DefaultProposalFactory
from tests.factories._sharing import SharedProposalFactory


class TestSharedCommenting(DatabaseTest):
    def setUp(self):
        super(TestSharedCommenting, self).setUp()
        self.user = UserFactory()
        self.p = DefaultProposalFactory(company=self.user.company)
        self.shared = SharedProposalFactory(proposal=self.p)
        self.url = "/shared/{}/comments".format(self.p.share_uid)

    def test_start_thread_anonymous(self):
        with mail.record_messages() as outbox:
            data = dict(
                blockUid=self.p.blocks.all()[0].uid,
                comment="look a comment",
                username="bobby@tables.com"
            )
            _, status = self.post_json(self.url, data)

            self.assertEquals(status, 201)
            self.assertEquals(self.shared.comment_threads.count(), 1)

            thread = self.shared.comment_threads.first()
            self.assertEqual(thread.comments.first().username, data["username"])
            self.assertTrue(thread.comments.first().from_client)

            self.assertEqual(len(outbox), 1)
            self.assertSetEqual(outbox[0].send_to, {self.user.email})

    def test_start_thread_logged_in(self):
        with mail.record_messages() as outbox:
            data = dict(
                blockUid=self.p.blocks.all()[0].uid,
                comment="look a comment",
            )
            _, status = self.post_json(self.url, data, user=self.user)
            self.assertEquals(status, 201)
            self.assertEquals(self.shared.comment_threads.count(), 1)

            thread = self.shared.comment_threads.first()
            self.assertEqual(thread.comments.first().username, self.user.username)
            self.assertFalse(thread.comments.first().from_client)
            # No mail for logged in users
            self.assertEqual(len(outbox), 0)

    def test_errors_if_anynomous_and_no_username(self):
        data = dict(
            blockUid=self.p.blocks.all()[0].uid,
            comment="look a comment",
        )
        _, status = self.post_json(self.url, data)

        self.assertEquals(status, 400)

    def test_append_comment_to_thread_anonymous(self):
        with mail.record_messages() as outbox:
            block = self.shared.blocks.all()[0]
            self.shared.comment_threads.append(SharedCommentThread(block_id=block.id, block_uid=block.uid))
            thread = self.shared.comment_threads.all()[0]
            data = dict(threadId=thread.id, comment="look a comment", username="Bobby")

            self.assertEquals(thread.comments.count(), 0)
            _, status = self.post_json(self.url, data)

            self.assertEquals(status, 201)
            self.assertEquals(thread.comments.count(), 1)
            self.assertEquals(thread.comments.first().username, data["username"])

            self.assertEqual(len(outbox), 1)
            self.assertSetEqual(outbox[0].send_to, {self.user.email})

    def test_append_comment_to_thread_logged_in(self):
        block = self.shared.blocks.all()[0]
        self.shared.comment_threads.append(SharedCommentThread(block_id=block.id, block_uid=block.uid))
        thread = self.shared.comment_threads.all()[0]
        data = dict(threadId=thread.id, comment="look a comment", username="Bobby")

        self.assertEquals(thread.comments.count(), 0)
        _, status = self.post_json(self.url, data, user=self.user)

        self.assertEquals(status, 201)
        self.assertEquals(thread.comments.count(), 1)
        self.assertEquals(thread.comments.first().username, self.user.username)

    def test_disabled_user_dont_receive_mails(self):
        UserFactory(disabled=True, company=self.user.company)
        with mail.record_messages() as outbox:
            data = dict(
                blockUid=self.p.blocks.all()[0].uid,
                comment="look a comment",
                username="bobby@tables.com"
            )
            self.post_json(self.url, data)
            self.assertEqual(len(outbox), 1)
            self.assertSetEqual(outbox[0].send_to, {self.user.email})

    def test_unactivated_user_dont_receive_mails(self):
        UserFactory(activation_token=b'232', company=self.user.company)
        with mail.record_messages() as outbox:
            data = dict(
                blockUid=self.p.blocks.all()[0].uid,
                comment="look a comment",
                username="bobby@tables.com"
            )
            self.post_json(self.url, data)
            self.assertEqual(len(outbox), 1)
            self.assertSetEqual(outbox[0].send_to, {self.user.email})
