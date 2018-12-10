from ..setup import db

from enum import Enum
from typing import Any


class BlockType(Enum):
    Section = "section"
    Paragraph = "paragraph"
    Subtitle = "subtitle"
    UnorderedItem = "uli"
    OrderedItem = "oli"
    Image = "image"
    CostTable = "cost_table"
    Quote = "quote"
    Embed = "embed"
    Signature = "signature"
    Divider = "divider"
    H3 = "h3"
    Payment = "payment"
    Table = "table"


BlockTypeDBEnum = db.Enum(*[b.value for b in list(BlockType)], name="BlockTypeEnum") # type: ignore


class ProposalStatus(Enum):
    Draft = "draft"
    Sent = "sent"
    Won = "won"
    Lost = "lost"
    Trash = "trash"


ProposalStatusDBEnum = db.Enum(*[b.value for b in list(ProposalStatus)], name="ProposalStatusEnum") # type: ignore
