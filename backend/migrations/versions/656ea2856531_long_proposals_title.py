"""long proposals title

Revision ID: 656ea2856531
Revises: 0655c7236616
Create Date: 2017-01-10 13:50:59.737867

"""

# revision identifiers, used by Alembic.
revision = '656ea2856531'
down_revision = '0655c7236616'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.alter_column('proposals', 'title', existing_type=sa.String(length=100), type_=sa.String(length=255))


def downgrade():
    op.alter_column('proposals', 'title', existing_type=sa.String(length=255), type_=sa.String(length=100))
