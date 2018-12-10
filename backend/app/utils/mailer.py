from threading import Thread
import logging

from flask import current_app, render_template
from flask_mail import Message
from mailjet_rest import Client
from .tokens import create_expiring_jwt

from ..setup import mail, db
from ..models.mailjet import Message as MailjetMessage


LOG = logging.getLogger(__name__)


def send_async_test_email(app, msg):
    """Only used in dev/test settings"""
    with app.app_context():
        mail.send(msg)


def inject_proposal_url(**kwargs):
    app = current_app._get_current_object()
    kwargs.update({
        "proposal_url": "%s/p/%s" % (app.config["BASE_URL"], kwargs["share_uid"])
    })


def send_email_with_template(to, subject: str, template: str, **kwargs):
    app = current_app._get_current_object()
    kwargs.update({"base_url": app.config["BASE_URL"]})
    text_body = render_template(template + ".txt", **kwargs)
    html_body = render_template(template + ".html", **kwargs)
    send_email(to, subject, text_body, html_body, template, **kwargs)


def send_email(to, subject: str, text_body, html_body, reason, **kwargs):
    """Not meant to be used directly"""
    # We can an empty to list in a couple of cases probably
    # The obvious example is client comment when no user is activated
    # mailjet returns a 400 if we send them an empty To
    if len(to) == 0:
        return

    app = current_app._get_current_object()
    # Sent in a thread to avoid timeout as the call is blocking
    # Don't use mailjet when not in prod
    if not app.config["PRODUCTION"]:
        msg = Message(subject, recipients=to, bcc=kwargs.get("bcc", None))

        msg.body = text_body
        msg.html = html_body
        if app.config["DEBUG"]:
            print(to)
            print(msg.body)
        thr = Thread(target=send_async_test_email, args=(app, msg, ))
        thr.start()
        return

    data = {
        "FromEmail": kwargs.get("fromEmail", "team@proppy.io"),
        "FromName": kwargs.get("fromName", "Proppy"),
        "Subject": kwargs.get("subject", subject),
        "Text-Part": text_body,
        "Html-Part": html_body,
        "To": ",".join(to)
    }
    bcc = kwargs.get("bcc", None)
    if bcc:
        data.update({"Bcc": ",".join(bcc)})

    if "replyTo" in kwargs:
        data.update({"Headers": {"Reply-To": kwargs["replyTo"]}})

    def send_async():
        mailjet = Client(auth=(app.config["MAILJET_API_KEY"], app.config["MAILJET_API_SECRET"]))

        # Response of send.create is this:
        # {'Sent': [{'Email': 'tom+3@wearewizards.io', 'MessageID': 19421835755008714}]}
        try:
            response = mailjet.send.create(data=data)
            result = response.json()
            # We had issues where the message ID was already in our db
            if not MailjetMessage.query.get(result['Sent'][0]['MessageID']):
                db.session.add(
                    MailjetMessage(
                        id=result['Sent'][0]['MessageID'],
                        json_response=result,
                        message_reason=reason,
                    )
                )
                db.session.commit()
        except Exception as e:
            db.session.rollback()
            # Mailjet can fail and we'd get an invalid json response, log that instead of throwing
            LOG.warn("Mailjet failed in giving us info: %r - %r" % (e, response.status_code))

    # Send in thread so we aren't blocking users on signup. If this
    # fails users will still be able to re-send their activation mail
    # with the button in settings.
    Thread(target=send_async).start()


def send_activation_email(to: str, **kwargs):
    return send_email_with_template([to], "Activate your Proppy account", "mails/activation", **kwargs)


def send_password_reset_email(to: str, **kwargs):
    return send_email_with_template([to], "Reset your Proppy password", "mails/password_reset", **kwargs)


def send_team_invite_email(to: str, **kwargs):
    return send_email_with_template([to], "You have been invited to join a team on Proppy!", "mails/team_invite", **kwargs)


def send_trial_end_email(to: str, **kwargs):
    # Expire in 5 years so people can always unsubscribe
    token = create_expiring_jwt(dict(email=to), expires_in=60 * 60 * 24 * 365 * 5)
    kwargs.update({"token": token.decode('utf8')})

    return send_email_with_template([to], "Your free trial for Proppy is expiring!", "mails/trial_ending", **kwargs)


def send_welcome_email(to, **kwargs):
    # Expire in 5 years so people can always unsubscribe
    token = create_expiring_jwt(dict(email=to), expires_in=60 * 60 * 24 * 365 * 5)
    kwargs.update({"token": token.decode('utf8')})

    return send_email_with_template([to], "First impressions?", "mails/welcome", **kwargs)


# The ones below need to have a proposal_url in kwargs for the view action
def send_client_signed_email(to, **kwargs):
    inject_proposal_url(**kwargs)
    return send_email_with_template(to, "Proposal signed!", "mails/client_signed", **kwargs)


# The ones below need to have a proposal_url in kwargs for the view action
def send_client_paid_email(to, **kwargs):
    inject_proposal_url(**kwargs)
    return send_email_with_template(to, "Proposal paid!", "mails/client_paid", **kwargs)


# TODO find a way to get a html body to inject a view action?
def send_proposal_share_email(to, **kwargs):
    kwargs["fromEmail"] = "proposals@proppy.io"
    return send_email(to, kwargs.pop("subject"), kwargs.pop("body"), None, "share-mail", **kwargs)


def send_new_client_comments_email(to, **kwargs):
    inject_proposal_url(**kwargs)
    return send_email_with_template(
        to,
        "%s posted a comment on %s" % (kwargs["client"], kwargs["title"]),
        "mails/new_comment",
        **kwargs
    )
