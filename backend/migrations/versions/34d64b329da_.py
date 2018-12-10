"""empty message

Revision ID: 34d64b329da
Revises: f22f3de9cd7d
Create Date: 2016-03-01 15:35:13.394154

"""

# revision identifiers, used by Alembic.
revision = '34d64b329da'
down_revision = 'f22f3de9cd7d'

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column


def transform(d):
    currency = d.pop("currency")
    d["title"] = ""
    return {
        "sections": [d],
        "currency": currency,
        "discount": 0,
        "schema-version": 2,
        "total": d.get("total", 0),
        "subtotal": d.get("total", 0),
    }

blocks = table(
    'blocks',
    column('uid', sa.dialects.postgresql.UUID),
    column('type', sa.Enum),
    column('data', sa.dialects.postgresql.JSONB),
)

def upgrade():
    c = op.get_bind()
    for row in c.execute(sa.select([blocks.c.uid, blocks.c.data]).where(blocks.c.type == "cost_table")):
        c.execute(sa.update(blocks).where(blocks.c.uid==row.uid).values({'data': transform(row.data)}))


def downgrade():
    connection = op.get_bind()


def test():
    import unittest
    in_= {"rows": [["Server / Month", "7", "12", 84]], "total": 84, "currency": "£"}
    expected = {"sections": [ {"title": "", "rows": [["Server / Month", "7", "12", 84]], "total": 84}],
                "currency": "£",
                "discount": 0,
                "schema-version": 2,
                "total": 84,
                "subtotal": 84,
    }

    unittest.TestCase().assertDictEqual(expected, transform(in_))
    print("OK")


if __name__ == '__main__':
    test()
