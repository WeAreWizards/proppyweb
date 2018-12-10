from app.models.companies import Company
from app.models.blocks import Block
from app.models.shared_blocks import SharedBlock


def dump_company(company_id=None):
    if company_id is None:
        return {}

    company = Company.query.get(company_id)
    proposals = company.proposals.all()
    proposals_ids = [p.id for p in proposals]
    shared_proposals = []  # type: ignore
    for p in proposals:
        shared_proposals += [s for s in p.shared_proposals.all()]
    shared_proposals_ids = [p.id for p in shared_proposals]

    data = {
        "company": company.to_json(),
        "users": [user.to_json(get_token=False) for user in company.users.all()],
        "clients": [client.to_json() for client in company.clients.all()],
        "proposals":  [p.to_json() for p in proposals],
        "shared_proposals":  [s.to_json() for s in shared_proposals],
    }

    blocks = []  # type: ignore
    for p_id in proposals_ids:
        blocks += Block.query.filter_by(proposal_id=p_id)

    shared_blocks = []  # type: ignore
    for p_id in shared_proposals_ids:
        shared_blocks += SharedBlock.query.filter_by(shared_proposal_id=p_id)

    data.update({
        "blocks": [b.to_json() for b in blocks],
        "shared_blocks": [b.to_json() for b in shared_blocks],
    })

    return data
