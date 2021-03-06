"""disable users

Revision ID: 3b86a1f1fa35
Revises: 55f72855e70
Create Date: 2016-04-05 18:14:28.073001

"""

# revision identifiers, used by Alembic.
revision = '3b86a1f1fa35'
down_revision = '55f72855e70'

from alembic import op
import sqlalchemy as sa


def upgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.add_column('users', sa.Column('disabled', sa.Boolean(), nullable=False, server_default="False"))
    op.alter_column('users', 'disabled', server_default=None)
    ### end Alembic commands ###


def downgrade():
    ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('users', 'disabled')
    ### end Alembic commands ###
