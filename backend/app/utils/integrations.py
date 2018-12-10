import base64
import logging

from ..models.companies import Company
from ..models.integrations import ContactsIntegration
from ..models.clients import Client
from ..setup import db

import requests
from typing import List, Dict, Any

class IntegrationException(Exception): pass

class IntegrationAuthFailed(IntegrationException): pass
class OtherError(IntegrationException): pass


def get_pipedrive_contacts(api_token):
    """
    https://developers.pipedrive.com/v1
    TEST API TOKEN = 8ff8a852bd2f813b7db97ee87755794416e9f70d
    """
    response = requests.get("https://api.pipedrive.com/v1/persons?api_token=%s" % api_token)
    users = []
    clients = []
    clients_seen = [] # type: List[Dict[str, Any]]

    error = response.json().get('error')
    if error is not None:
        print("ERR", error)
        if 'You need to be authorized' in error:
            raise IntegrationAuthFailed()
        raise OtherError()

    try:
        # YOLO error handling
        for user in response.json()["data"]:
            for email in user["email"]:
                if not email["value"]:
                    continue
                has_org = "org_name" in user and user["org_name"] is not None
                users.append({
                    "name": user["name"],
                    "email": email["value"],
                    "sourceId": user["id"],
                    "companyName": user["org_name"] if has_org else None,
                    "companyId": user["org_id"]["value"] if has_org else None,
                })

                if has_org and user["org_id"]["value"] not in clients_seen:
                    clients.append({"id": user["org_id"]["value"], "name": user["org_name"]})
                    clients_seen.append(user["org_id"]["value"])
                elif user["id"] not in clients_seen:
                    clients.append({"id": user["id"], "name": user["name"]})
                    clients_seen.append(user["id"])
    except Exception as e:
        print("pipedrive error", response.json())
        raise

    return users, clients


def get_insightly_contacts(api_key):
    """
    https://api.insight.ly/v2.2/Help#!/Contacts/GetContacts
    Test API Key = 5bb810bb-7632-48f5-93cd-5bfa0459ef7d"
    It creates users as contact so we will import themselves from the CRM as well...
    """
    basic_auth = "%s:" % api_key
    b64 = base64.b64encode(basic_auth.encode('utf8'))
    # It seems we can't get the company name in the contacts call
    org_response = requests.get(
        "https://api.insight.ly/v2.2/Organisations",
        headers={"Authorization": "Basic %s" % b64.decode("utf-8")}
    ).json()
    organisations = {o["ORGANISATION_ID"]: o["ORGANISATION_NAME"] for o in org_response}

    users_response = requests.get(
        "https://api.insight.ly/v2.2/Contacts?brief=false&count_total=false",
        headers={"Authorization": "Basic %s" % b64.decode("utf-8")}
    )
    users = []
    clients = []
    clients_seen = [] # type: List[Dict[str, Any]]

    for user in users_response.json():
        for contact_info in user["CONTACTINFOS"]:
            if contact_info["TYPE"] != "EMAIL":
                continue
            has_org = user["DEFAULT_LINKED_ORGANISATION"] is not None

            users.append({
                "name": "%s %s" % (user["FIRST_NAME"], user["LAST_NAME"]),
                "email": contact_info["DETAIL"],
                "sourceId": user["CONTACT_ID"],
                # can have no companies
                "companyName": organisations[user["DEFAULT_LINKED_ORGANISATION"]] if has_org else None,
                "companyId": user["DEFAULT_LINKED_ORGANISATION"] if has_org else None,
            })
            if has_org and user["DEFAULT_LINKED_ORGANISATION"] not in clients_seen:
                clients.append({
                    "id": user["DEFAULT_LINKED_ORGANISATION"],
                    "name": organisations[user["DEFAULT_LINKED_ORGANISATION"]]
                })
                clients_seen.append(user["DEFAULT_LINKED_ORGANISATION"])
            elif user["CONTACT_ID"] not in clients_seen:
                clients.append({"id": user["CONTACT_ID"], "name": "%s %s" % (user["FIRST_NAME"], user["LAST_NAME"])})
                clients_seen.append(user["CONTACT_ID"])

    return users, clients


def get_zoho_contacts(auth_token):
    """
    https://www.zoho.com/crm/help/api/getrecords.html#e10
    TEST auth_token = 37b00077473aa4410bf2ce75a3f8e163
    """
    response = requests.get(
        "https://crm.zoho.com/crm/private/json/Contacts/getRecords?newFormat=2&authtoken=%s&scope=crmapi&selectColumns=Contacts(First Name,Last Name,Email,Account Name, Account Id)"
        % auth_token
    )

    users = [] # type: List[Dict[str, Any]]
    clients = [] # type: List[Dict[str, Any]]
    clients_seen = [] # type: List[Dict[str, Any]]

    # zoho doesn't return an empty result list, they return an error
    # for whatever reason. We just change that into an empty list:
    if 'nodata' in response.json()["response"]:
        return users, clients

    for user in response.json()["response"]["result"]["Contacts"]["row"]:
        # we get a list of dict instead of an object...
        data = user["FL"]
        user_data = {}
        first_name = ""
        last_name = ""
        # Not sure if order is guaranteed
        for field in data:
            if field["val"] == "CONTACTID":
                user_data["sourceId"] = field["content"]
            elif field["val"] == "ACCOUNTID":
                user_data["companyId"] = field["content"]
            elif field["val"] == "Account Name":
                user_data["companyName"] = field["content"]
            elif field["val"] == "Email":
                user_data["email"] = field["content"]
            elif field["val"] == "First Name":
                first_name = field["content"]
            elif field["val"] == "Last Name":
                last_name = field["content"]
        user_data["name"] = "%s %s" % (first_name, last_name)
        users.append(user_data)

        if "companyID" in user_data and user_data["companyId"] not in clients_seen:
            clients.append({"id": user_data["companyId"], "name": user_data["companyName"]})
            clients_seen.append(user_data["companyId"])
        elif user_data["sourceId"] not in clients_seen:
            clients.append({"id": user_data["sourceId"], "name": user_data["name"]})
            clients_seen.append(user_data["sourceId"])

    return users, clients


def sync_contacts():
    """
    Sync contacts for all integrations that can do so for all companies
    """
    def _sync(name, company, contacts, clients):
        clients_left = company.delete_clients_from_integration(name)
        company.integration_contacts.append(
            ContactsIntegration(source=name, contacts=contacts)
        )
        for client in clients:
            if client["id"] in clients_left:
                continue

            company.clients.append(
                Client(name=client["name"], source=name, source_id=client["id"])
            )

        db.session.add(company)

    for company in Company.query.all():
        if company.pipedrive is not None:
            try:
                contacts, clients = get_pipedrive_contacts(company.pipedrive.api_token)
            except Exception as e:
                logging.error("Failed to sync Pipedrive contacts for %s: %s", company.name, e)
            _sync("pipedrive", company, contacts, clients)

        if company.insightly is not None:
            try:
                contacts, clients = get_insightly_contacts(company.insightly.api_key)
            except Exception as e:
                logging.error("Failed to sync Insightly contacts for %s: %s", company.name, e)
            _sync("insightly", company, contacts, clients)

        if company.zoho_crm is not None:
            try:
                contacts, clients = get_zoho_contacts(company.zoho_crm.auth_token)
            except Exception as e:
                logging.error("Failed to sync ZohoCRM contacts for %s: %s", company.name, e)
            _sync("zohocrm", company, contacts, clients)
