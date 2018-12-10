import threading
import requests
import logging
from retrying import retry
import app.utils.signalling as signalling

# DO NOT DELETE THIS: blinker uses weak references and without anything holding
# onto the receivers they will be GCed and blinker will never call the signal.
WEAK_REF_HOLD = []

# To be executed in a thread. Retries a few times.
def build_trigger(event: str):
    """
    This function takes an event name and returns a new function which can be
    connected to a blinker signal.

    The new function will look up the rest hook for the event name and then
    trigger that with some light retry logic.
    """
    from ..models.zapier import ZapierHookEndpoint
    from ..setup import db

    def trigger_receiver(sender, company, payload):
        # make a list to avoid DB access in thread
        company_name = str(company)
        endpoints = list(x.target_url for x in ZapierHookEndpoint.query.filter_by(company_id=company.id, event=event))

        # log non-action as well, interesting for debugging
        if not endpoints:
            logging.info("No hooks for  for {}: {}({})".format(company_name, event, payload))

        for target_url in endpoints:
            logging.info("Zapier triggering for {}: {}({})".format(company_name, event, payload))

            @retry(wait_exponential_multiplier=1000, stop_max_attempt_number=3)
            def trigger():
                response = requests.post(target_url, json=payload)
                # zapier say that we should delete our endpoint on 401 gone:
                logging.info("Zapier triggering for {}: {}({})".format(company_name, event, payload))
                if response.status_code == 401:
                    logging.error("We should delete %s but we're in a thread so we lost the DB context", target_url)
                    # TODO, following doesn't work:
                    # db.session.delete(endpoint)

            threading.Thread(target=trigger).start()

    WEAK_REF_HOLD.append(trigger_receiver) # DO NOT DELETE THIS LINE!

    return trigger_receiver


def init_app(app):
    """
    Connect flask signals to trigger actions in zapier. This is only for
    the production system.
    """
    if not app.config["PRODUCTION"]:
        logging.info("PRODUCTION != True, not connecting zapier triggers")
        return

    for x in list(signalling.Trigger): # type: ignore
        logging.info("Connecting zapier trigger %s", x)

        # x.value is the lower-case event name
        s = getattr(signalling.SIGNAL, x.name)
        s.connect(build_trigger(x.value))
