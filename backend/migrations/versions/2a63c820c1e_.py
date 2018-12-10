"""empty message

Revision ID: 2a63c820c1e
Revises: c623c7b1fc22
Create Date: 2016-07-12 13:07:43.139710

"""

# revision identifiers, used by Alembic.
revision = '2a63c820c1e'
down_revision = 'c623c7b1fc22'

from alembic import op
import sqlalchemy as sa


def upgrade():
    # Idempotent, no need to downgrade
    op.execute('ALTER TABLE blocks ALTER COLUMN version TYPE bigint')


def downgrade():
    pass
