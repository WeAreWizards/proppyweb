"""empty message

Revision ID: 43fcecc2e20
Revises: 3d8892a9d47
Create Date: 2016-06-18 11:26:27.809530

"""

# revision identifiers, used by Alembic.
revision = '43fcecc2e20'
down_revision = '3d8892a9d47'

from alembic import op
import sqlalchemy as sa
import app.models.users as users
from app.setup import db

def upgrade():
    db.session.add(users.Unsubscribed(email="runbgn@gmail.com"))
    db.session.add(users.Unsubscribed(email="ivan.pushapp@gmail.com"))

def downgrade():
    pass
