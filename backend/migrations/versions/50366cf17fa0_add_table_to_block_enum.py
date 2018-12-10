"""Add table to block enum

Revision ID: 50366cf17fa0
Revises: 606dd6210987
Create Date: 2017-03-13 12:21:51.603814

"""

# revision identifiers, used by Alembic.
revision = '50366cf17fa0'
down_revision = '606dd6210987'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.execute('COMMIT')  # See https://bitbucket.org/zzzeek/alembic/issue/123
    op.execute("ALTER TYPE \"BlockTypeEnum\" ADD value 'table' after 'payment'")


def downgrade():
    pass
