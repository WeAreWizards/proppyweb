"""empty message

Revision ID: 1e9fc27c3d3
Revises: 49cd951a84f
Create Date: 2016-06-14 12:14:47.401562

"""

# revision identifiers, used by Alembic.
revision = '1e9fc27c3d3'
down_revision = '49cd951a84f'

from alembic import op
import sqlalchemy as sa


def upgrade():
    conn = op.get_bind()
    conn.execute(sa.text("ALTER TABLE users ALTER COLUMN email TYPE CITEXT"))
    conn.execute(sa.text("ALTER TABLE users ALTER COLUMN username TYPE CITEXT"))


def downgrade():
    conn = op.get_bind()
    conn.execute(sa.text("ALTER TABLE users ALTER COLUMN email TYPE varchar(256)"))
    conn.execute(sa.text("ALTER TABLE users ALTER COLUMN username TYPE varchar(100)"))
