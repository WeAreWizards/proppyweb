import logging
from ..models.companies import Company
from app.setup import db


def merge_companies_command(company_a_id, company_b_id):
    check_phrase = 'merge {} into {}'.format(company_b_id, company_a_id)
    check = input("Enter '{}' to merge: ".format(check_phrase))
    assert check == check_phrase

    merge_companies(company_a_id, company_b_id)


def merge_companies(company_a_id, company_b_id):
    """
    Merges users & proposals of company b into company a.
    """
    assert company_a_id != company_b_id, "Must provide two different company ids"

    a = Company.query.get(company_a_id)
    b = Company.query.get(company_b_id)

    assert a is not None, "Company with id {} not found".format(company_a_id)
    assert b is not None, "Company with id {} not found".format(company_b_id)

    logging.info("Merging %r into %r", b, a)

    assert a.subscription_cache == None and b.subscription_cache == None, "cannot merge companies with subscriptions automatically"
    for x in b.clients:
        x.company_id = a.id

    for x in b.proposals:
        x.company_id = a.id

    for x in b.users:
        x.company_id = a.id

    db.session.commit()
