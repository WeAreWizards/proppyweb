import flask
import json
import jsonschema

from app.setup import mail
from app.models.shared_blocks import SharedBlock
from app.models.blocks import Block
from app.models.enums import BlockType
from tests.common import DatabaseTest
from tests.factories._users import UserFactory
from tests.factories._proposals import DefaultProposalFactory
from tests.factories._sharing import SignatureFactory
from app import schemas


class TestSigningSchema(DatabaseTest):
    def setUp(self):
        super().setUp()
        self.user = UserFactory()
        self.p = DefaultProposalFactory(client=None)
        self.sig = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA0MAAALoCAYAAAC6bC52"

    def test_block_schema(self):
        s = self.p.create_shared([])
        blocks = [x.to_json() for x in s.blocks]
        jsonschema.validate(blocks, schemas.blocks)

    def test_signing_doc_schema(self):
        doc = self.p.create_shared([]).get_signing_doc(self.sig, "bob", "127.0.0.1", "user-agent")
        jsonschema.validate(doc, schemas.signed_proposal_v1)

    def test_signing(self):
        doc = self.p.create_shared([]).get_signing_doc(self.sig, "bob", "127.0.0.1", "user-agent")
        jsonschema.validate(doc, schemas.signed_proposal_v1)

        encoded = json.dumps(doc)
        signer = flask.current_app.config['KEYCZAR_SIGNER']

        # Doesn't raise an exception
        signer.Sign(encoded)


class TestSigning(DatabaseTest):
    def setUp(self):
        super().setUp()
        self.user = UserFactory()
        self.p = DefaultProposalFactory(company=self.user.company, client=None)
        self.shared = self.p.create_shared([])
        self.url = "/shared/%s/sign" % self.p.share_uid
        self.data = {
            "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA0MAAALoCAYAAAC6bC52",
            "name": "Bob",
            "userAgent": "user-agent"
        }
        self.sig_block = SharedBlock.from_proposal_block(Block(BlockType.Signature.value, ordering=10))

    def test_can_sign_shared_proposal_anon(self):
        self.shared.blocks.append(self.sig_block)

        with mail.record_messages() as outbox:
            _, code = self.post_json(self.url, self.data)

            self.assertEqual(code, 200)
            self.assertEqual(self.p.signature.count(), 1)
            # It should update the signature block
            signed_block = self.shared.get_signature_block()
            self.assertEqual(signed_block.data["signature"], self.data["signature"])
            self.assertEqual(signed_block.data["name"], self.data["name"])
            self.assertIn("hash", signed_block.data)
            self.assertEqual(self.p.status, "won")
            self.assertEqual(len(outbox), 1)
            self.assertIn(self.p.title, outbox[0].body)
            self.assertIn(self.data["name"], outbox[0].body)

    def test_cannot_sign_proposal_already_signed(self):
        SignatureFactory(proposal=self.p, shared_proposal=self.shared)
        _, code = self.post_json(self.url, self.data)

        self.assertEqual(code, 400)
        self.assertEqual(self.p.signature.count(), 1)

    def test_cannot_sign_proposal_without_signature_block(self):
        SignatureFactory(proposal=self.p, shared_proposal=self.shared)
        _, code = self.post_json(self.url, self.data)

        self.assertEqual(code, 400)
        self.assertEqual(self.p.signature.count(), 1)
