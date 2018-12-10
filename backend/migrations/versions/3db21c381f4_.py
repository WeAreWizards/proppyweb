"""empty message

Revision ID: 3db21c381f4
Revises: 2a63c820c1e
Create Date: 2016-08-04 10:03:47.082239

"""

# revision identifiers, used by Alembic.
revision = '3db21c381f4'
down_revision = '2a63c820c1e'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.execute('ALTER TABLE companies ALTER COLUMN name TYPE varchar(512)')


def downgrade():
    # idempotent no downgrade required
    pass
