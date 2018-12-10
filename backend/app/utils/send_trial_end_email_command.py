import datetime
from app.models.companies import Company
from app.models.users import Unsubscribed
from ..setup import db

from .mailer import send_trial_end_email


def send_trial_end_emails_command():
    """
    Send an email 4 days before the end of the trial if the company hasn't
    signed up. Only email admins that have not been emailed yet.
    """
    today = datetime.datetime.today().date()
    companies = Company.query.filter(
        Company.subscription_cache == None
    ).all()
    unsubscribed = set(x.email for x in Unsubscribed.query.all())

    for c in companies:
        end_trial_time = c.get_trial_expiry_date()
        email_cutoff = end_trial_time - datetime.timedelta(days=4)
        if email_cutoff.date() != today:
            continue

        for admin in c.get_admins():
            if admin.trial_end_email_sent or admin.email in unsubscribed:
                continue

            admin.trial_end_email_sent = True
            db.session.add(admin)
            db.session.commit()
            print("sending to %s" % admin.email)
            send_trial_end_email(admin.email, **{"username": admin.username})
