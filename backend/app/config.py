import os
import keyczar.keyczar as keyczar


def relpath(p):
    return os.path.abspath(os.path.join(os.path.dirname(__file__), p))


class Config(object):
    DEBUG = False
    TESTING = False
    PRODUCTION = False
    SECRET_KEY = os.environ.get("SECRET_KEY") or "secret"
    BASE_URL = os.environ.get("BASE_URL") or "http://0.0.0.0:3000"
    SENTRY_DSN = os.environ.get("SENTRY_DSN")
    SLACK_AUTH_TOKEN = os.environ.get("SLACK_AUTH_TOKEN")

    S3_BUCKET_NAME = os.environ.get("PROPPY_S3_BUCKET", "proppy-test")

    CHARGEBEE_API_KEY = os.environ.get("CHARGEBEE_API_KEY", "")
    CHARGEBEE_SITE = os.environ.get("CHARGEBEE_SITE", "proppy-test")

    MAILJET_API_KEY = os.environ.get("MAILJET_API_KEY", "")
    MAILJET_API_SECRET = os.environ.get("MAILJET_API_SECRET", "")
    PDF_RENDERER_BASE_URL = os.environ.get("PDF_RENDERER_BASE_URL", "http://admin:8201/api/render-pdf")

    # Id 17760 -> production,  ID 18112 -> staging
    MAILJET_PROPPRY_GENERAL_UPDATES_LIST_ID = os.environ.get("MAILJET_PROPPRY_GENERAL_UPDATES_LIST_ID", "")

    GEOIP_DATABASE_PATH = os.environ.get("GEOIP_DATABASE_PATH", "./GeoLite2-City.mmdb")

    KEYCZAR_KEY_PATH = os.environ.get("PROPPY_KEYCZAR_KEY_PATH", relpath("../testdata/test-signing-keys"))
    if os.path.exists(KEYCZAR_KEY_PATH):
        KEYCZAR_SIGNER = keyczar.Signer.Read(KEYCZAR_KEY_PATH)
    else:
        KEYCZAR_SIGNER = None

    # In days
    TRIAL_LENGTH = 14

    # Length after which the various tokens expire
    LOGIN_PERIOD_EXPIRY = 60 * 60 * 24 * 7 * 8  # 8 weeks
    ACTIVATION_PERIOD_EXPIRY = 60 * 60 * 24 * 7  # 7 days
    RESET_PASSWORD_PERIOD_EXPIRY = 60 * 60 * 24 * 1  # 1 day

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_RECORD_QUERIES = True

    BCRYPT_LOG_ROUNDS = 10

    # Mail settings
    MAIL_SERVER = "0.0.0.0"
    MAIL_PORT = 25
    MAIL_DEFAULT_SENDER = "Proppy <team@proppy.io>"
    MAIL_DEBUG = True
    MAIL_SUPPRESS_SEND = True

    ALLOWED_UPLOAD_MIMETYPES = [
        "image/jpg",
        "image/jpeg",
        "image/png",
        "image/gif",
    ]

    ES_SERVER = os.environ.get("ES_SERVER", "127.0.0.1:9200")
    ES_IMPORT_INDEX = "proposals"

    # Integration
    SLACK_CLIENT_ID = "2639475339.106087107473"
    # TODO: put that in env
    SLACK_CLIENT_SECRET = os.environ.get("SLACK_CLIENT_SECRET", "")

    STRIPE_CLIENT_ID = os.environ.get("STRIPE_CLIENT_ID", "")
    STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")

    @staticmethod
    def init_app(app):
        pass


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("DEV_DATABASE_URL")


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("TEST_DATABASE_URL")
    BCRYPT_LOG_ROUNDS = 4
    ES_IMPORT_INDEX = "proposals-test"


class ProductionConfig(Config):
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    BCRYPT_LOG_ROUNDS = 12
    MAIL_SUPPRESS_SEND = False
    PRODUCTION = True
    CHARGEBEE_API_KEY = os.environ.get("CHARGEBEE_API_KEY", "")
    CHARGEBEE_SITE = os.environ.get("CHARGEBEE_SITE", "proppy-test")

    @staticmethod
    def init_app(app):
        import logging
        from logging.handlers import SysLogHandler
        log_handler = SysLogHandler()
        log_handler.setLevel(logging.INFO)
        app.logger.addHandler(log_handler)

config = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,

    "default": DevelopmentConfig
}
