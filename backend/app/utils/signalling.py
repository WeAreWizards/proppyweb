import inspect
from enum import Enum
from blinker import signal
import types

class Trigger(Enum):
    PROPOSAL_CREATED = "proposal_created"
    PROPOSAL_MOVED_TO = "proposal_moved_to"
    PROPOSAL_DUPLICATED = "proposal_duplicated"
    PROPOSAL_PUBLISHED = "proposal_published"

    # TODO, more triggers
    #    USER_COMMENTED = "user_commented"
    #    CLIENT_PAID = "client_paid"

# A class with the same members as Trigger, but the values are blinker signals.
SIGNAL = types.new_class(
    "SIGNAL",
    exec_body=lambda body: body.update(dict((x.name, signal(x.value)) for x in list(Trigger))) # type: ignore
)
