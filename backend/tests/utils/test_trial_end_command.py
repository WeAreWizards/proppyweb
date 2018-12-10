import datetime

import flask

from app.setup import mail

from tests.common import DatabaseTest
from tests.factories._users import UserFactory
from tests.factories._payments import ChargebeeSubscriptionCacheFactory


from app.utils.send_trial_end_email_command import send_trial_end_emails_command


class TrialEndTest(DatabaseTest):
    def setUp(self):
        super(TrialEndTest, self).setUp()
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=flask.current_app.config["TRIAL_LENGTH"] - 4)
        self.u = UserFactory(is_admin=True)
        self.u.company.created_at = cutoff
        UserFactory(is_admin=True)
        u2 = UserFactory(is_admin=True, trial_end_email_sent=True)
        u2.company.created_at = cutoff
        # u3 has a sub
        u3 = UserFactory(is_admin=True)
        ChargebeeSubscriptionCacheFactory(company=u3.company)
        u3.company.created_at = cutoff

    def test_send_emails(self):
        with mail.record_messages() as outbox:
            send_trial_end_emails_command()
            self.assertEqual(len(outbox), 1)

    def test_override_end_date(self):
        created = datetime.datetime(2017, 1, 1) # needs to be past our release date
        self.u.company.created_at = created
        self.assertEqual(
            self.u.company.get_trial_expiry_date(),
            created + datetime.timedelta(days=flask.current_app.config["TRIAL_LENGTH"])
        )
        # override
        self.u.company.trial_expiry_date_override = datetime.datetime(2018, 1, 1)
        self.assertEqual(
            self.u.company.get_trial_expiry_date(),
            datetime.datetime(2018, 1, 1)
        )
