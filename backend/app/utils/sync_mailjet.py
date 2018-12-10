import datetime
import logging
import time
import flask
import mailjet_rest
import dateutil.parser

from ..models.mailjet import Contact, ClickStatistics, OpenInformation, Message
from ..models.users import User, Unsubscribed
from ..setup import db


def ensure_contact_in_db(mailjet, id_):
    contact = mailjet.contact.get(id_).json()
    assert len(contact['Data']) == 1, "unexpected reponse: {}".format(contact)
    contact = contact['Data'][0]
    contact = Contact(id=contact['ID'], email=contact['Email'], json_response=contact)
    db.session.merge(contact)
    try:
        db.session.commit()
    except:
        db.session.rollback()
        raise
    return contact


def ensure_message_in_db(mailjet, id_):
    message = Message.query.get(id_)
    if message is not None:
        return message

    message = mailjet.message.get(id_).json()
    assert len(message['Data']) == 1, "unexpected reponse: {}".format(message)
    message = message['Data'][0]
    message = Message(id=message['ID'], json_response=message, message_reason="backfilled-missing-from-send")
    db.session.merge(message)
    try:
        db.session.commit()
    except:
        db.session.rollback()
        raise
    return message


def contactslist_exists(mailjet, id_):
    response = mailjet.contactslist.get(id_)
    return response.ok


def sync_from_mailjet(delta_hours=6):
    """
    mailjet has two tables, one for opened and one for clicked.

    We're running this job every hour and getting the last 6h of changes,
    that way we cover windows of downtime.
    """
    conf = flask.current_app.config
    mailjet = mailjet_rest.Client(auth=(conf["MAILJET_API_KEY"], conf["MAILJET_API_SECRET"]))
    from_ts = int(time.time() - delta_hours * 3600) # 6h ago
    logging.info("syncing from {}".format(from_ts))

    for x in mailjet.openinformation.get_many({"FromTS": from_ts}).json()['Data']:
        oi = OpenInformation.query.get(x['MessageID'])
        if oi is not None:
            continue

        contact = ensure_contact_in_db(mailjet, x['ContactID'])
        ensure_message_in_db(mailjet, x['MessageID'])

        opened_at = dateutil.parser.parse(x['OpenedAt'])
        oi = OpenInformation(json_response=x, contact_id=contact.id, opened_at=opened_at, message_id=x['MessageID'])
        db.session.merge(oi)

    for x in mailjet.clickstatistics.get_many({"FromTS": from_ts}).json()['Data']:
        cs = ClickStatistics.query.get(x['MessageID'])
        if cs is not None:
            continue
        contact = ensure_contact_in_db(mailjet, x['ContactID'])
        ensure_message_in_db(mailjet, x['MessageID'])

        clicked_at = dateutil.parser.parse(x['ClickedAt'])
        cs = ClickStatistics(json_response=x, contact_id=contact.id, clicked_at=clicked_at, message_id=x['MessageID'])
        db.session.merge(cs)

    unsubscribed = set(x.email for x in Unsubscribed.query.all())
    # So apparently we can't request just the unsub list of contacts, it returns
    # an empty array
    # That means we need to do one API request to get the ids of unsub and then
    # one per user to get their email
    filters = {"Limit": 0, "Unsub": "true"}
    logging.info("Syncing unsubscribe")
    for x in mailjet.listrecipient.get(filters=filters).json()["Data"]:
        try:
            email = mailjet.contact.get(id=x["ContactID"]).json()['Data'][0]["Email"]
        except Exception as e:
            logging.error("Failed to fetch contact %d from mailjet: %r" % (x["ContactID"], e))
        if email not in unsubscribed:
            logging.info("Unsubscribing %s" % email)
            db.session.add(Unsubscribed(email=email))

    try:
        db.session.commit()
    except:
        db.session.rollback()
        raise


def sync_to_mailjet(execute, delta_hours):
    conf = flask.current_app.config
    mailjet = mailjet_rest.Client(auth=(conf["MAILJET_API_KEY"], conf["MAILJET_API_SECRET"]))
    list_id = conf['MAILJET_PROPPRY_GENERAL_UPDATES_LIST_ID']

    # Wait 5 days to sign people up to avoid spamming them before we
    # sent the introductory feedback email.
    #
    # Sync over delta_hours window and we run hourly so we collect everyone.
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=5)
    start = cutoff - datetime.timedelta(hours=delta_hours)

    assert contactslist_exists(mailjet, list_id), "unexpected error: contactslists not found"

    unsubscribed = set(x.email for x in Unsubscribed.query.all())
    contacts = list(
        dict(Email=x.email) for x in User.query.filter(User.created_at >= start, User.created_at < cutoff)
        if x.email not in unsubscribed
    )
    remove = list(dict(Email=x) for x in unsubscribed)

    logging.info("Adding to contact list (there may be some overlap) from %s to %s; ListID: %s; Contacts: %s",
                 start, cutoff, list_id, contacts)

    if execute:
        # See https://dev.mailjet.com/guides/#contact_managemanycontacts
        response = mailjet.contactslist_managemanycontacts.create({
            "Action": "addnoforce",
            "Contacts": contacts,
        }, id=list_id)
        if not response.ok:
            logging.error("mailjet upload failed: %s", response.json())

        # TODO wait for job to finish to report status.
        # mailjet_rest.client.api_call(mailjet.auth, 'get', 'https://api.mailjet.com/v3/REST/contactslist/18112/managemanycontacts/7040130', {})

        # Expliclty unsubscribe people in case they're still stuck
        response = mailjet.contactslist_managemanycontacts.create({
            "Action": "remove",
            "Contacts": remove,
        }, id=list_id)

        if not response.ok:
            logging.error("mailjet removing failed: %s", response.json())


"""
For reference: mailjet output:



[{'ClickedAt': '2016-06-19T13:43:11Z',
   'ClickedDelay': 4,
   'ContactID': 37622043,
   'ID': -1,
   'MessageID': 18295936218945304,
   'Url': 'https://app.proppy.io/activate/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjpudWxsLCJleHAiOjE0NjY5NDg1NjMsImNvbXBhbnkiOm51bGwsImlzcyI6InByb3BweSIsImlhdCI6MTQ2NjM0Mzc2MywidHlwZSI6ImFjdGl2YXRpb24ifQ.74zVwettpq4GPuJvaPFt_jWJU1fji_BMu0fOCfKNS_c',
   'UserAgentID': 677}],

opened:

  {'ArrivedAt': '2016-06-19T13:42:43Z',
   'CampaignID': 14719415,
   'ContactID': 37622043,
   'ID': -1,
   'MessageID': 18295936218945304,
   'OpenedAt': '2016-06-19T13:43:07Z',
   'UserAgentFull': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_5) AppleWebKit/601.6.17 (KHTML, like Gecko)',
   'UserAgentID': 1}]

"""


def sync_properties_to_mailjet():
    """Only whether they are paying right now"""
    conf = flask.current_app.config
    mailjet = mailjet_rest.Client(auth=(conf["MAILJET_API_KEY"], conf["MAILJET_API_SECRET"]))
    list_id = conf['MAILJET_PROPPRY_GENERAL_UPDATES_LIST_ID']

    unsubscribed = set(x.email for x in Unsubscribed.query.all())
    contacts = []

    for user in User.query.all():
        if user.email in unsubscribed:
            continue
        contacts.append({
            "Email": user.email,
            "Properties": {
                "paying": user.company.is_paying(),
            },
        })

    response = mailjet.contactslist_managemanycontacts.create({
        "Action": "addnoforce",
        "Contacts": contacts,
    }, id=list_id)
    if not response.ok:
        logging.error("mailjet upload failed: %s", response.json())
