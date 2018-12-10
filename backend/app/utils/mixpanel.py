import os
from threading import Thread

import mixpanel

from app.models.companies import Company


def send(consumer, endpoint, message):
    consumer.send(endpoint, message)


class ThreadConsumer(object):
    def __init__(self):
        self.consumer = mixpanel.Consumer()

    def send(self, endpoint, message):
        thr = Thread(target=send, args=(self.consumer, endpoint, message, ))
        thr.start()


# Docs at
# https://mixpanel.com/help/reference/python
mp = mixpanel.Mixpanel(os.environ.get("MIXPANEL_TOKEN", "ba1ffdaa6512aba4fb249e3df17707d9"), ThreadConsumer())
