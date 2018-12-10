import os
import datetime
import time
from unittest import SkipTest, mock, skipIf

from elasticsearch import Elasticsearch
from flask import current_app

from app.setup import db
from app.utils.search import ingest_proposals, cleanup_index, create_index


from tests.common import DatabaseTest
from tests.factories._proposals import DefaultProposalFactory


def get_test_client(delete_index=True):
    """
    Taken from elasticsearch-py own tests:
    https://github.com/elastic/elasticsearch-py/blob/master/elasticsearch/helpers/test.py
    """
    kw = {'timeout': 30}
    url = current_app.config["ES_SERVER"]
    client = Elasticsearch([url], **kw)
    if delete_index:
        client.indices.delete(index=current_app.config["ES_IMPORT_INDEX"], ignore=[404])
    # Creating an index is asynchronous so do that first in tests
    # We always get 503 errors otherwise
    create_index()

    # wait for yellow status
    for _ in range(100):
        try:
            client.cluster.health(wait_for_status="yellow")
            return client
        except ConnectionError:
            time.sleep(0.1)
    else:
        # timeout
        raise SkipTest("Elasticsearch failed to start.")


@skipIf(os.environ.get('SKIP_ES_TEST'), "ES tests skipped via SKIP_ES_TEST env var")
@mock.patch("app.utils.search.get_client", new_callable=get_test_client)
class SearchIndexingProposal(DatabaseTest):
    """
    The indexing needs some sleep(1) to make sure ES processed things as the fn
    calls are async
    """
    def setUp(self):
        super(SearchIndexingProposal, self).setUp()
        self.proposal1 = DefaultProposalFactory()
        self.proposal2 = DefaultProposalFactory(company=self.proposal1.company)
        self.index = current_app.config["ES_IMPORT_INDEX"]
        self.es_client = get_test_client(delete_index=True)

    def test_ingest_all_proposals(self, _):
        ingest_proposals(ingest_all=True)
        time.sleep(1)
        self.assertEqual(self.es_client.count(index=self.index)["count"], 2)

    def test_ingest_proposals(self, _):
        self.proposal1.updated_at = datetime.datetime.utcnow() - datetime.timedelta(minutes=20)
        ingest_proposals()
        time.sleep(1)
        self.assertEqual(self.es_client.count(index=self.index)["count"], 1)

    def test_cleanup_index(self, _):
        ingest_proposals(ingest_all=True)
        time.sleep(1)
        db.session.delete(self.proposal2)
        cleanup_index()
        time.sleep(1)
        self.assertEqual(self.es_client.count(index=self.index)["count"], 1)
