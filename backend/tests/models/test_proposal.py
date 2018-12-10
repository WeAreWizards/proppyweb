import uuid

from app.models.blocks import BlockType, Block

from tests.common import DatabaseTest
from tests.factories._proposals import ProposalFactory


class TestProposal(DatabaseTest):
    def setUp(self):
        super(TestProposal, self).setUp()
        self.proposal = ProposalFactory()
        self.section_uid = str(uuid.uuid4())
        self.subsection_uid = str(uuid.uuid4())
        self.last_subsection_uid = str(uuid.uuid4())

        self.proposal.blocks.extend([
            Block(BlockType.Paragraph.value, None, data={'value': 'Welcome'}, ordering=0),
            Block(BlockType.Section.value, None, data={'value': 'Introduction'}, ordering=1, uid=self.section_uid),
            Block(BlockType.Paragraph.value, None, data={'value': 'My name is'}, ordering=2),
            Block(BlockType.Subtitle.value, None, data={'value': 'Previous word'}, ordering=3),
            Block(BlockType.UnorderedItem.value, None, data={'value': 'first'}, ordering=4),
            Block(BlockType.OrderedItem.value, None, data={'value': 'second'}, ordering=5),
            Block(BlockType.Section.value, None, data={'value': 'Scope'}, ordering=6),
            Block(BlockType.UnorderedItem.value, None, data={'value': 'ul'}, ordering=7),
            Block(BlockType.Subtitle.value, None, data={'value': 'Design'}, ordering=8, uid=self.subsection_uid),
            Block(BlockType.Paragraph.value, None, data={'value': 'Mac'}, ordering=9),
            Block(BlockType.Paragraph.value, None, data={'value': ''}, ordering=10),
            Block(BlockType.Subtitle.value, None, data={'value': 'Dev'}, ordering=11, uid=self.last_subsection_uid),
            Block(BlockType.Signature.value, None, data={'name': 'Bob'}, ordering=12),
        ])

    def test_can_extract_search_content(self):
        search_content = self.proposal.extract_search_content()
        self.assertEqual(len(search_content), 5)

        self.assertEqual(search_content[0][1], "h1")
        self.assertEqual(search_content[0][2], "Introduction")
        self.assertEqual(search_content[0][3], "My name is Previous word first second")

        self.assertEqual(search_content[1][1], "h1")
        self.assertEqual(search_content[1][2], "Scope")
        self.assertEqual(search_content[1][3], "ul Design Mac  Dev")

        self.assertEqual(search_content[2][1], "h2")
        self.assertEqual(search_content[2][2], "Previous word")
        self.assertEqual(search_content[2][3], "first second")

        self.assertEqual(search_content[3][1], "h2")
        self.assertEqual(search_content[3][2], "Design")
        self.assertEqual(search_content[3][3], "Mac ")

        self.assertEqual(search_content[4][1], "h2")
        self.assertEqual(search_content[4][2], "Dev")

    def test_get_import_section_blocks_h1(self):
        blocks = self.proposal.get_import_section_blocks(self.section_uid)
        self.assertEqual(len(blocks), 5)

    def test_get_import_section_blocks_h2(self):
        blocks = self.proposal.get_import_section_blocks(self.subsection_uid)
        self.assertEqual(len(blocks), 3)

    def test_importing_doesnt_remove_old_blocks(self):
        blocks = self.proposal.get_import_section_blocks(self.subsection_uid)
        self.assertNotEqual(blocks[0].uid, self.subsection_uid)

    def test_signature_block_gets_emptied(self):
        blocks = self.proposal.get_import_section_blocks(self.last_subsection_uid)
        self.assertFalse("name" in blocks[-1].data)
