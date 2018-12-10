from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_admin import Admin
from . import auth
from .config import config

from .views import (
    ProposalView, UserView, CompanyView, SharedProposalView,
    OneCompanyView,
)

# Need all imports for foreign key sqlalchemy resolution
from app.models import clients
from app.models import proposals
from app.models import shared_comments
from app.models import shared_proposals
from app.models import users
from app.models import companies
from app.models import signatures
from app.models import payments

db = SQLAlchemy()

# Inspiration: http://mrjoes.github.io/2015/06/17/flask-admin-120.html
# design from https://colorlib.com/polygon/gentelella/
admin = Admin(name="Proppy admin", base_template="layout.html")



def create_app(config_name: str):
    app = Flask(__name__)
    conf = config[config_name]
    app.config.from_object(conf)
    conf.init_app(app)
    if config_name != "development":
        auth.login_manager.init_app(app)

    db.init_app(app)
    admin.init_app(app)

    admin.add_view(UserView(users.User, db.session))
    admin.add_view(CompanyView(companies.Company, db.session))
    admin.add_view(ProposalView(proposals.Proposal, db.session))
    admin.add_view(SharedProposalView(shared_proposals.SharedProposal, db.session))
    admin.add_view(OneCompanyView(db.session, name="One company", endpoint="company-details"))

    return app
