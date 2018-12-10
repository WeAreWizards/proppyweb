"""empty message

Revision ID: 4fac9c1bc52
Revises: 42e8c801cb70
Create Date: 2016-06-27 15:57:07.439096

"""

# revision identifiers, used by Alembic.
revision = '4fac9c1bc52'
down_revision = '42e8c801cb70'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.execute('COMMIT')  # See https://bitbucket.org/zzzeek/alembic/issue/123
    op.execute("ALTER TYPE \"BlockTypeEnum\" ADD value 'signature' after 'embed'")


def downgrade():
    connection = op.get_bind()
    raise Exception("""
      no downgrade for postgres enum, if needed implement using
      http://stackoverflow.com/questions/25811017/how-to-delete-an-enum-type-in-postgres"
    """)
