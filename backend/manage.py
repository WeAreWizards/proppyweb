#!/usr/bin/env python
import os
import sys

from flask_script import Manager, Shell, Server
from flask_migrate import Migrate, MigrateCommand

from app.setup import create_app, db
from app.models.blocks import Block
from app.models.shared_blocks import SharedBlock
from app.models.shared_proposals import SharedProposal
from app.models.clients import Client
from app.models.companies import Company
from app.models.proposals import Proposal
from app.models.users import User, Unsubscribed
from app.models.shared_comments import SharedComment, SharedCommentThread
from app.models.signatures import Signature
from app.models.payments import ChargebeeSubscriptionCache
from app.models.analytics import Event
from app.models.integrations import (
    SlackIntegration, ZohoCRMIntegration, InsightlyIntegration,
    PipedriveIntegration, ContactsIntegration, StripeIntegration
)
from app.models.zapier import ZapierIntegration, ZapierTriggerEvent, ZapierHookEndpoint
from app.utils.slackbot import slacklog_run_forever
from app.utils.send_welcome_emails_command import send_welcome_emails_command
from app.utils.send_trial_end_email_command import send_trial_end_emails_command
from app.utils.sync_mailjet import (
    sync_from_mailjet as sync_from_mailjet_command,
    sync_to_mailjet as sync_to_mailjet_command,
    sync_properties_to_mailjet as sync_properties_to_mailjet_command
)
from app.utils.search import reindex, ingest_proposals, cleanup_index
from app.utils.merge_companies import merge_companies_command
from app.utils.run_gunicorn import StandaloneApplication
from app.utils.integrations import sync_contacts

from testdata.commands import CoolAgencyCommand

# We have a chicken and egg problem here: We need to initialize the
# app to register commands on management, but we don't know what
# config to use before registering & knowing the command. Checking
# sys.argv really is a hack.
if len(sys.argv) > 1 and sys.argv[1] == 'test':
    app = create_app('testing')
else:
    app = create_app(os.getenv('FLASK_CONFIG') or 'default')

manager = Manager(app)
migrate = Migrate(app, db)


def make_shell_context():
    return dict(
        app=app,
        Block=Block,
        Client=Client,
        Company=Company,
        Proposal=Proposal,
        SharedBlock=SharedBlock,
        SharedProposal=SharedProposal,
        User=User,
        SharedComment=SharedComment,
        SharedCommentThread=SharedCommentThread,
        Unsubscribed=Unsubscribed,
        ChargebeeSubscriptionCache=ChargebeeSubscriptionCache,
        Signature=Signature,
        SlackIntegration=SlackIntegration,
        ZohoCRMIntegration=ZohoCRMIntegration,
        InsightlyIntegration=InsightlyIntegration,
        PipedriveIntegration=PipedriveIntegration,
        ContactsIntegration=ContactsIntegration,
        Event=Event,
        StripeIntegration=StripeIntegration,
    )


manager.add_command("shell", Shell(make_context=make_shell_context))
manager.add_command('db', MigrateCommand)
manager.add_command("runserver", Server(host="0.0.0.0", port=7777))
manager.add_command("runadmin", Server(host="0.0.0.0", port=7777))
manager.add_command("cool-agency", CoolAgencyCommand)


@manager.command
def es_reindex():
    with app.app_context():
        reindex()


@manager.command
def es_ingestion():
    """Periodical (max 10 mins apart) ingestion for ES"""
    with app.app_context():
        ingest_proposals()
        cleanup_index()


@manager.command
def slackbot():
    with app.app_context():
        slacklog_run_forever()


@manager.command
def send_welcome_emails():
    with app.app_context():
        send_welcome_emails_command()


@manager.command
def send_trial_end_emails():
    with app.app_context():
        send_trial_end_emails_command()


@manager.command
def merge_companies(a_id, b_id):
    with app.app_context():
        merge_companies_command(int(a_id), int(b_id))


@manager.command
def sync_from_mailjet(delta_hours=6):
    with app.app_context():
        sync_from_mailjet_command(int(delta_hours))


@manager.command
def sync_to_mailjet(execute=False, delta_hours=6):
    with app.app_context():
        sync_to_mailjet_command(execute, int(delta_hours))


@manager.command
def sync_properties_to_mailjet():
    with app.app_context():
        sync_properties_to_mailjet_command()


@manager.command
def sync_integration_contacts():
    with app.app_context():
        sync_contacts()


@manager.command
def run_gunicorn():
    """
    Run gunicorn from within manage.py because by the time we run manage.py we
    know that we have a working environment (PYTHON_PATH, configuration, ..., sockets)
    """
    options =  {
        'bind': '{}:{}'.format('127.0.0.1', '8000'),
        'workers': 4,
        'preload': True,
    }
    StandaloneApplication(app, options).run()


@manager.command
def list_routes():
    import urllib

    output = []
    for rule in app.url_map.iter_rules():
        methods = ','.join(rule.methods)
        line = urllib.parse.unquote("{:50s} {:20s} {}".format(rule.endpoint, methods, rule))
        output.append(line)

    for line in sorted(output):
        print(line)


@manager.command
def clean_shared_comments_for_company(company_id, execute=False):
    def collect():
        for p in Proposal.query.filter_by(company_id=company_id).all():
            for x in p.shared_proposals.all():
                for y in x.comment_threads.all():
                    yield y

    comments = list(collect())
    if not execute:
        print("dry run, use --execute to actually delete")
    print("company:\033[1m", Company.query.filter_by(id=company_id).first().name, "\033[0m")
    print("deleting", comments)
    if execute:
        for x in comments:
            db.session.delete(x)


@manager.command
def clean_analytics_for_company(company_id, execute=False):
    def collect():
        for p in Proposal.query.filter_by(company_id=company_id).all():
            for x in p.shared_proposals.all():
                yield x

    shared_proposals = list(collect())
    if not execute:
        print("dry run, use --execute to actually delete")
    print("company:\033[1m", Company.query.filter_by(id=company_id).first().name, "\033[0m")
    if execute:
        for s in shared_proposals:
            s.events.delete()
        db.session.commit()


@manager.command
def test(pattern="test*.py"):
    import unittest
    db.engine.execute("CREATE EXTENSION IF NOT EXISTS citext")

    with app.app_context():
        # Reflect "reflects" the current state of the DB which may
        # contain tables no longer explicitly defined in code but
        # still having FK constraints that would make drop_all fail.
        db.reflect()
        db.drop_all()
        db.create_all()
        tests = unittest.TestLoader().discover('tests', pattern=pattern)
        unittest.TextTestRunner(verbosity=2).run(tests)


if __name__ == '__main__':
    manager.run()
