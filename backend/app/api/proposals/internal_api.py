from ...models.proposals import Proposal
from ...utils.tokens import get_random_string
from ...models.blocks import Block
from ...setup import db
from ...models.enums import BlockType
from ...utils import signalling


def create_empty_proposal(company, title=""):
    proposal = Proposal(
        title=title,
        company_id=company.id,
        share_uid=get_random_string(),
        cover_image_url="",
    )
    db.session.add(proposal)
    db.session.commit()

    # And add some default blocks
    proposal.blocks.append(Block(BlockType.Section.value, ordering=0))
    proposal.blocks.append(Block(BlockType.Paragraph.value, ordering=1))
    db.session.add(proposal)

    signalling.SIGNAL.PROPOSAL_CREATED.send(company=proposal.company, payload={ # type: ignore
        "id": proposal.id,
    })
    return proposal
