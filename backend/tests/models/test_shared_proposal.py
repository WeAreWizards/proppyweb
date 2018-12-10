from datetime import datetime, timedelta
import uuid

from tests.common import DatabaseTest
from tests.factories._proposals import ProposalFactory
from tests.factories._sharing import SharedProposalFactory, EventFactory


class TestProposalAnalytics(DatabaseTest):
    def setUp(self):
        super(TestProposalAnalytics, self).setUp()
        self.proposal = ProposalFactory()
        self.user1 = str(uuid.uuid4())
        self.user2 = str(uuid.uuid4())
        self.shared1 = SharedProposalFactory(proposal_id=self.proposal.id)
        self.shared2 = SharedProposalFactory(proposal_id=self.proposal.id)

        self.start = datetime.utcnow()

        def get_future(seconds):
            return self.start + timedelta(seconds=seconds)

        EventFactory(shared_proposal=self.shared1, kind="load", user_uid=self.user1, created_at=self.start)
        EventFactory(shared_proposal=self.shared1, kind="ping", user_uid=self.user1, created_at=get_future(15), data={})
        EventFactory(shared_proposal=self.shared1, kind="ping", user_uid=self.user1, created_at=get_future(30), data={})

        EventFactory(shared_proposal=self.shared1, kind="load", user_uid=self.user1, created_at=get_future(500))
        EventFactory(shared_proposal=self.shared1, kind="ping", user_uid=self.user1, created_at=get_future(555), data={})

        EventFactory(shared_proposal=self.shared1, kind="load", user_uid=self.user2, created_at=get_future(10))
        EventFactory(shared_proposal=self.shared1, kind="ping", user_uid=self.user2, created_at=get_future(50), data={})

        EventFactory(shared_proposal=self.shared1, kind="outbound_click", user_uid=self.user2, data={"url": "proppy.io"})
        EventFactory(shared_proposal=self.shared1, kind="outbound_click", user_uid=self.user1, data={"url": "google.io"})
        EventFactory(shared_proposal=self.shared1, kind="outbound_click", user_uid=self.user1, data={"url": "proppy.io"})

        EventFactory(shared_proposal=self.shared2, kind="load", user_uid=self.user1, created_at=self.start)
        EventFactory(shared_proposal=self.shared2, kind="load", user_uid=self.user2, created_at=get_future(10))
        EventFactory(shared_proposal=self.shared2, kind="ping", user_uid=self.user2, created_at=get_future(25), data={})
        EventFactory(shared_proposal=self.shared2, kind="outbound_click", user_uid=self.user1, data={"url": "google.io"})

    def test_get_analytics(self):
        analytics = self.shared1.get_analytics()
        self.assertEqual(analytics["numberViews"], 3)
        self.assertEqual(
            analytics["outboundClicks"],
            [{"url": "proppy.io", "count": 2}, {"url": "google.io", "count": 1}]
        )

        sessions = analytics["sessions"]
        self.assertEqual(len(sessions), 3)

        self.assertEqual([s["length"] for s in sessions], [55, 40, 30])

        analytics = self.shared2.get_analytics()
        self.assertEqual(analytics["numberViews"], 2)
        self.assertEqual(analytics["outboundClicks"], [{"url": "google.io", "count": 1}])

        sessions = analytics["sessions"]
        self.assertEqual(len(sessions), 2)

        self.assertEqual([s["length"] for s in sessions], [15, 1])
