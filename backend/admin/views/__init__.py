from datetime import datetime
import logging

from flask import request
from flask_admin.contrib.sqla import ModelView
from flask_admin import BaseView, expose
from flask_admin.model import typefmt
from flask_login import current_user
from markupsafe import Markup

from app.models.shared_proposals import SharedProposal
from app.models.proposals import Proposal
from app.models.companies import Company


LOG = logging.getLogger(__name__)


def date_format(view, value):
    return value.strftime("%Y/%m/%d %H:%M")

MY_DEFAULT_FORMATTERS = dict(typefmt.BASE_FORMATTERS)
MY_DEFAULT_FORMATTERS.update({
    datetime: date_format
})


# Customized admin interface
class CustomView(ModelView):
    list_template = "list.html"
    create_template = "create.html"
    edit_template = "edit.html"
    can_edit = False
    can_view_details = True
    column_type_formatters = MY_DEFAULT_FORMATTERS
    column_default_sort = "id"


class ProposalView(CustomView):
    can_delete = False
    column_searchable_list = ["title", "company.name"]
    column_sortable_list = ("id", "company.name", "created_at", "updated_at", "tags", "status")
    column_list = ("id", "title", "status", "tags", "client.name", "company.name", "created_at", "updated_at")
    column_labels = {"client.name": "Client", "company.name": "Company"}

    def get_query(self):
        # Only show latest version of proposal
        return self.session.query(self.model).filter(Proposal.title != "Start here!")


class UserView(CustomView):
    can_delete = False
    column_searchable_list = ["username", "email", "company.name"]
    column_list = ("id", "username", "email", "company.id", "company.name", "is_active", "is_admin", "created_at", "updated_at")
    column_labels = {"company.name": "Company", "company.id": "Company Id"}

    column_default_sort = ("created_at", True)


class CompanyView(CustomView):
    can_delete = True
    column_searchable_list = ["name"]
    column_list = ("id", "name", "number_users", "number_proposals", "number_shared_proposals", "created_at")

    column_formatters = dict(id=lambda v, c, m, p: Markup('<a href="/admin/company-details/{id}">{id}</a>'.format(id=m.id)))

    def after_model_delete(self, model):
        LOG.info("Company %s was deleted %s" % (model.name, request.headers.get("X-Forwarded-Email", current_user)))


class SharedProposalView(CustomView):
    can_delete = False
    column_searchable_list = ["title", "proposal.company.name"]
    column_list = ("id", "title", "version", "proposal.company.name", "created_at")
    column_labels = {"proposal.company.name": "Company"}


class OneCompanyView(BaseView):
    def __init__(self, dbsession, **kwargs):
        self.dbsession = dbsession
        BaseView.__init__(self, **kwargs)

    @expose("/")
    def index(self, company_id=None):
        print(company_id)
        return self.render('company.html')

    @expose("/<int:company_id>")
    def details(self, company_id=None):
        company = Company.query.get_or_404(company_id)

        DEFAULT_BRANDING = { # TODO: import from main app
            "fontHeaders": "Lato",
            "fontBody": "Tisa",
            "primaryColour": "#40C181",
            "bgColour": "#fff",
            "textColour": "#454B4F",
        }
        changed_branding = dict()
        for k, v in DEFAULT_BRANDING.items():
            if company.branding.get(k) != v:
                changed_branding[k] = "{} -> {}".format(v, company.branding.get(k))

        return self.render(
            'company.html',
            proposals=company.proposals.all(),
            company=company,
            data=company.to_json(),
            changed_branding=changed_branding,
        )
