import datetime
from app.models import users
from ..setup import db

from .mailer import send_welcome_email


def send_welcome_emails_command():
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=1)
    candidates = users.User.query.filter(
        users.User.welcome_email_sent == False,
        users.User.created_at <= cutoff,
    ).all()

    for x in candidates:
        x.welcome_email_sent = True
        db.session.add(x)
        db.session.commit()
        print("sending to %s", x.email)

        send_welcome_email(x.email)
