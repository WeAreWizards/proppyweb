import logging
import logging.handlers
from flask import Flask
from flask_mail import Mail
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from raven.contrib.flask import Sentry
from werkzeug.contrib.fixers import ProxyFix
from typing import Any
import app.utils.zapier as zapier

import chargebee


from .config import config


mail = Mail()
db = SQLAlchemy() # type: Any
bcrypt = Bcrypt()
cors = CORS()
sentry = Sentry()


def create_app(config_name: str):
    app = Flask(__name__)

    # See https://github.com/getsentry/raven-python/blob/master/docs/integrations/flask.rst
    # and https://github.com/WeAreWizards/proppyweb/issues/480
    # (sentry reporting wrong remote address)
    app.wsgi_app = ProxyFix(app.wsgi_app)

    conf = config[config_name] # type: Any
    # logging config needs to come before first call to log
    if not conf.TESTING:
        logging.basicConfig(level=logging.INFO)
        logging.getLogger().addHandler(logging.handlers.SysLogHandler(address='/run/systemd/journal/dev-log'))

    app.config.from_object(conf)
    conf.init_app(app)

    zapier.init_app(app)

    mail.init_app(app)
    db.init_app(app)
    cors.init_app(app)
    bcrypt.init_app(app)
    if not conf.DEBUG and not conf.TESTING:
        sentry.init_app(app, dsn=conf.SENTRY_DSN)

    chargebee.configure(conf.CHARGEBEE_API_KEY, conf.CHARGEBEE_SITE)

    from .api import api_bp
    app.register_blueprint(api_bp)
    return app
