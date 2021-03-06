"""branding

Revision ID: 3a527ab0858a
Revises: 5980ac97e61
Create Date: 2016-08-10 18:17:53.142591

"""

# revision identifiers, used by Alembic.
revision = '3a527ab0858a'
down_revision = '5980ac97e61'

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.add_column('companies', sa.Column('branding', postgresql.JSONB(), server_default='{"bgColour": "#fff", "textColour": "#454B4F", "fontHeaders": "Lato", "fontBody": "Tisa", "primaryColour": "#40C181"}', nullable=False))
    ### end Alembic commands ###


def downgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('companies', 'branding')
    ### end Alembic commands ###
