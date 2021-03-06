"""delete unused comments and last seen tables

Revision ID: a6dedba383df
Revises: 2fb67288380
Create Date: 2017-08-22 18:09:34.217440

"""

# revision identifiers, used by Alembic.
revision = 'a6dedba383df'
down_revision = '2fb67288380'

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('comments')
    op.drop_table('comment_threads')
    op.drop_table('proposal_last_seen')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('proposal_last_seen',
    sa.Column('id', sa.INTEGER(), nullable=False),
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('proposal_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('seen_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['proposal_id'], ['proposals.id'], name='proposal_last_seen_proposal_id_fkey'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='proposal_last_seen_user_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='proposal_last_seen_pkey'),
    sa.UniqueConstraint('user_id', 'proposal_id', name='proposal_last_seen_user_id_proposal_id_key')
    )
    op.create_table('comment_threads',
    sa.Column('id', sa.INTEGER(), server_default=sa.text("nextval('comment_threads_id_seq'::regclass)"), nullable=False),
    sa.Column('proposal_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('block_uid', postgresql.UUID(), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=False),
    sa.Column('resolved', sa.BOOLEAN(), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['block_uid'], ['blocks.uid'], name='comment_threads_block_uid_fkey', ondelete='CASCADE', initially='DEFERRED', deferrable=True),
    sa.ForeignKeyConstraint(['proposal_id'], ['proposals.id'], name='comment_threads_proposal_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name='comment_threads_pkey'),
    postgresql_ignore_search_path=False
    )
    op.create_table('comments',
    sa.Column('id', sa.INTEGER(), nullable=False),
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('thread_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('created_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=False),
    sa.Column('updated_at', postgresql.TIMESTAMP(), autoincrement=False, nullable=False),
    sa.Column('comment', sa.VARCHAR(), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['thread_id'], ['comment_threads.id'], name='comments_thread_id_fkey', ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name='comments_user_id_fkey'),
    sa.PrimaryKeyConstraint('id', name='comments_pkey')
    )
    # ### end Alembic commands ###
