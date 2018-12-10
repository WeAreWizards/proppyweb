from datetime import datetime

from app.models.blocks import BlockType, Block

from tests.common import DatabaseTest
from tests.factories._clients import ClientFactory
from tests.factories._users import UserFactory
from tests.factories._proposals import DefaultProposalFactory
from tests.factories._sharing import SharedProposalFactory, SignatureFactory


class TestProposal(DatabaseTest):
    def setUp(self):
        super(TestProposal, self).setUp()
        self.user = UserFactory()
        self.p = DefaultProposalFactory(company=self.user.company, client=None)

    def test_create_empty(self):
        _, status = self.post_json("/proposals", {}, user=self.user)

        self.assertEqual(status, 201)
        proposals = self.user.company.proposals.all()
        self.assertEqual(len(proposals), 2)
        self.assertEqual(len(proposals[1].blocks.all()), 2)

    def test_get_doesnt_send_user_tokens(self):
        data, status = self.get_json("/proposals/%d" % self.p.id, user=self.user)
        self.assertEqual(status, 200)
        self.assertEqual(data["users"][0]["loginToken"], "")

    def test_duplicate(self):
        _, status = self.post_json("/proposals/%d/duplicate" % self.p.id, {}, user=self.user)

        self.assertEqual(status, 201)
        proposals = self.user.company.proposals.all()
        self.assertEqual(len(proposals), 2)
        self.assertEqual(len(proposals[0].blocks.all()), len(proposals[1].blocks.all()))
        self.assertEqual("Copy of %s" % proposals[0].title, proposals[1].title)

    def test_delete_not_in_trash(self):
        response = self.delete("/proposals/%d" % self.p.id, user=self.user)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.user.company.proposals.count(), 1)

    def test_delete_in_trash(self):
        self.p.status = "trash"
        response = self.delete("/proposals/%d" % self.p.id, user=self.user)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.user.company.proposals.count(), 0)

    def test_cant_delete_signed_proposal(self):
        self.p.status = "trash"
        SignatureFactory(proposal=self.p)
        response = self.delete("/proposals/%d" % self.p.id, user=self.user)
        self.assertEqual(response.status_code, 400)

    def test_get_shared_emails(self):
        SharedProposalFactory(proposal=self.p, sent_to=["a@b.com", "c@d.com"])
        data, _ = self.get_json("/proposals/%d" % self.p.id, user=self.user)
        self.assertEqual(data["proposal"]["shares"][0]["sentTo"], ["a@b.com", "c@d.com"])


class TestProposalUpdate(DatabaseTest):
    def setUp(self):
        super(TestProposalUpdate, self).setUp()
        self.user = UserFactory()
        self.p = DefaultProposalFactory(company=self.user.company, client=None)
        self.now = datetime.utcnow().timestamp() + 1000

    def test_update_proposal_data(self):
        data = dict(title="Hello", tags=["hey"], coverImageUrl="", updatedAt=self.now)
        resp, status = self.put_json("/proposals/%d" % self.p.id, data, user=self.user)

        self.assertEqual(status, 200)
        self.assertEqual(self.p.title, data["title"])
        self.assertEqual(self.p.tags, data["tags"])
        self.assertEqual(self.p.cover_image_url, data["coverImageUrl"])

    def test_set_new_client(self):
        data = dict(title="Hello", tags=["hey"], coverImageUrl="", clientName="WAW", updatedAt=self.now)
        resp, status = self.put_json("/proposals/%d" % self.p.id, data, user=self.user)

        self.assertEqual(status, 200)
        self.assertEqual(self.p.title, data["title"])
        self.assertEqual(self.p.tags, data["tags"])
        self.assertEqual(self.p.cover_image_url, data["coverImageUrl"])
        self.assertEqual(self.p.client.name, data["clientName"])
        self.assertEqual(self.user.company.clients.count(), 1)

    def test_set_existing_client(self):
        client = ClientFactory(company=self.user.company)
        data = dict(title="Hello", tags=["hey"], coverImageUrl="", clientId=client.id, updatedAt=self.now)
        resp, status = self.put_json("/proposals/%d" % self.p.id, data, user=self.user)

        self.assertEqual(status, 200)
        self.assertEqual(self.p.title, data["title"])
        self.assertEqual(self.p.tags, data["tags"])
        self.assertEqual(self.p.cover_image_url, data["coverImageUrl"])
        self.assertEqual(self.p.client, client)
        self.assertEqual(self.user.company.clients.count(), 1)

    def test_update_blocks(self):
        blocks = [
            Block(
                BlockType.Section.value,
                data={'value': 'Test'},
                proposal_id=self.p.id,
                ordering=0
            ).to_json()
        ]
        data = dict(title="Hello", tags=["hey"], coverImageUrl="", blocks=blocks, updatedAt=self.now)
        resp, status = self.put_json("/proposals/%d" % self.p.id, data, user=self.user)

        self.assertEqual(status, 200)
        self.assertEqual(self.p.title, data["title"])
        self.assertEqual(self.p.tags, data["tags"])
        self.assertEqual(self.p.cover_image_url, data["coverImageUrl"])
        prop_blocks = self.p.blocks.all()
        self.assertEqual(len(prop_blocks), 1)
        self.assertEqual(prop_blocks[0].data, blocks[0]["data"])

    def test_update_should_not_work_if_signed(self):
        SignatureFactory(proposal=self.p)
        data = dict(title="Hello", tags=["hey"], coverImageUrl="")
        resp, status = self.put_json("/proposals/%d" % self.p.id, data, user=self.user)

        self.assertEqual(status, 400)

    def test_changing_status_should_not_work_if_signed(self):
        SignatureFactory(proposal=self.p)
        data = dict(status="draft")
        resp, status = self.put_json("/proposals/%d/status" % self.p.id, data, user=self.user)

        self.assertEqual(status, 400)


class TestSectionImporting(DatabaseTest):
    def setUp(self):
        super(TestSectionImporting, self).setUp()
        self.user = UserFactory()
        self.p1 = DefaultProposalFactory(company=self.user.company)
        self.p2 = DefaultProposalFactory(company=self.user.company)

    def test_import_from_p1(self):
        section_to_import_uid = self.p1.blocks.order_by('ordering').all()[0].uid
        data = {"uidToImport": section_to_import_uid}

        self.assertEqual(self.p2.blocks.count(), 2)
        r, status = self.post_json("/proposals/%d/sections/import" % self.p2.id, data, user=self.user)
        self.assertEqual(len(r["blocks"]), 2)


class TestBlockDeletion(DatabaseTest):
    def setUp(self):
        super(TestBlockDeletion, self).setUp()
        self.user = UserFactory()
        self.p = DefaultProposalFactory(company=self.user.company, client=None)
        self.now = datetime.utcnow().timestamp() + 1000

    def test_remove_and_post(self):
        blocks_json = list(x.to_json() for x in self.p.blocks.all())
        self.assertEqual(len(blocks_json), 2)

        # delete all blocks
        data = dict(title="Hello", tags=["hey"], coverImageUrl="", blocks=[], updatedAt=self.now)
        resp, status = self.put_json("/proposals/%d" % self.p.id, data, user=self.user)

        self.assertEqual(status, 200)
        self.assertEqual(self.p.blocks.count(), 0)
        removed_blocks = Block.query.filter(Block.uid.in_(x["uid"] for x in blocks_json)).all()

        # the removed block
        self.assertEqual(len(removed_blocks), 2)
        self.assertSequenceEqual([None, None], [x.proposal_id for x in removed_blocks])

        # post blocks again,
        data = dict(title="Hello", tags=["hey"], coverImageUrl="", blocks=blocks_json, updatedAt=self.now)
        resp, status = self.put_json("/proposals/%d" % self.p.id, data, user=self.user)

        self.assertEqual(status, 200)
        self.assertEqual(self.p.blocks.count(), 2)
