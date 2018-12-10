"""empty message

Revision ID: 5980ac97e61
Revises: 3db21c381f4
Create Date: 2016-08-16 18:15:14.578970

"""

# revision identifiers, used by Alembic.
revision = '5980ac97e61'
down_revision = '3db21c381f4'

from alembic import op
import sqlalchemy as sa


def upgrade():
   op.execute('COMMIT')  # See https://bitbucket.org/zzzeek/alembic/issue/123
   op.execute("ALTER TYPE \"BlockTypeEnum\" ADD value 'divider' after 'signature'")
   op.execute("ALTER TYPE \"BlockTypeEnum\" ADD value 'h3' after 'divider'")


def downgrade():
    pass
