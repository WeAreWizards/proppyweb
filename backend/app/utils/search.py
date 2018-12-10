import time
import datetime

from elasticsearch import Elasticsearch
from elasticsearch.helpers import bulk
from elasticsearch_dsl import Search, Q
from flask import current_app

from ..models.proposals import Proposal


DOC_TYPE = "section"


def get_client():
    return Elasticsearch([current_app.config["ES_SERVER"]])


def create_index():
    """
    Uses a edge ngram analyzer so that we can search efficiently
    """
    index = current_app.config["ES_IMPORT_INDEX"]
    client = get_client()

    # Ensure index exists
    client.indices.create(index=index, body={
        "settings": {
            "number_of_shards": 1,  # TODO: do we need more?
            "analysis": {
                "filter": {
                    "edge_ngram_filter": {
                        "type": "edge_ngram",
                        "min_gram": 3,
                        "max_gram": 20
                    }
                },
                "analyzer": {
                    "edge_ngram_analyzer": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": [
                            "lowercase",
                            "edge_ngram_filter"
                        ]
                    }
                }
            }
        },
        "mappings": {
            DOC_TYPE: {
                "properties": {
                    "title": {
                        "type": "string",
                        "analyzer": "edge_ngram_analyzer",
                    },
                    "content": {
                        "type": "string",
                        "analyzer": "edge_ngram_analyzer",
                    },
                }
            }
        }
    }, ignore=400)


def _delete_proposals_from_index(proposal_ids):
    """
    Delete all the documents with the proposal_id set to one of the ids.
    ES removed delete_by_query so we have to query first to get the doc ids
    """
    index = current_app.config["ES_IMPORT_INDEX"]
    client = get_client()

    response = Search(using=client, index=index)\
        .filter("terms", proposal_id=proposal_ids)\
        .fields(["id"])\
        .execute()

    block_uids = [x.meta.id for x in response.hits]

    if len(block_uids) == 0:
        return

    bulk_data = []
    for _id in block_uids:
        bulk_data.append({
            "_op_type": "delete",
            "_index": index,
            "_type": DOC_TYPE,
            "_id": _id,
        })
    bulk(client, bulk_data)


def ingest_proposals(ingest_all=False):
    """
    If ingest_all is true, it will push every single proposal blocks to ES
    Otherwise it will only take the ones updated in the last 10min
    """
    client = get_client()
    index = current_app.config["ES_IMPORT_INDEX"]

    if ingest_all:
        proposals = Proposal.query.all()
    else:
        cutoff = datetime.datetime.utcnow() - datetime.timedelta(minutes=10)
        proposals = Proposal.query.filter(Proposal.updated_at >= cutoff).all()

    if len(proposals) == 0:
        return

    proposal_ids = [p.id for p in proposals]

    # First we remove all the proposals we are going to update from ES
    # so we don't have to find out which block was removed or anything
    _delete_proposals_from_index(proposal_ids)

    bulk_data = []
    for proposal in proposals:
        for content in proposal.extract_search_content():
            bulk_data.append({
                "_op_type": "index",
                "_index": index,
                "_type": DOC_TYPE,
                "_id": content[0],
                "_source": {
                    "company_id": proposal.company_id,
                    "proposal_id": proposal.id,
                    "proposal_title": proposal.title,
                    "level": content[1],
                    "title": content[2],
                    "content": content[3],
                }
            })

    if not bulk_data:
        return
    bulk(client, bulk_data)


def cleanup_index():
    """
    Deletes all the proposals that are not in our db anymore from ES
    """
    client = get_client()
    index = current_app.config["ES_IMPORT_INDEX"]

    proposals_id = set([p.id for p in Proposal.query.all()])

    response = Search(using=client, index=index).fields(["proposal_id"]).execute()
    es_proposal_ids = set([x.proposal_id[0] for x in response.hits])

    _delete_proposals_from_index(list(es_proposal_ids - proposals_id))


def delete_index():
    client = get_client()
    index = current_app.config["ES_IMPORT_INDEX"]
    client.indices.delete(index=index, ignore=[404])


def reindex():
    """
    Deletes the index and recreate it from scratch.
    ES doesn't actually delete the documents so we could call that method every
    week or so to keep the index lean
    """
    delete_index()
    time.sleep(1)
    create_index()
    time.sleep(1)
    ingest_proposals(ingest_all=True)


def find(query, company_id, proposal_id):
    client = get_client()
    index = current_app.config["ES_IMPORT_INDEX"]
    s = Search(using=client, index=index)
    s = s.filter("term", company_id=company_id)
    # s = s.filter(~Q("term", proposal_id=proposal_id))
    # Weighting title more than the content since a user writing an exact title
    # should yield that section rather than the same query in a content
    s = s.query(Q("multi_match", query=query, fields=["title^4", "content"]))
    s = s.highlight_options(order="score", pre_tags=["<span class='search-highlight'>"], post_tags=["</span>"])
    s = s.highlight("title", "content")
    # Only get the first 20 results
    response = s[:20].execute()
    return response.hits
