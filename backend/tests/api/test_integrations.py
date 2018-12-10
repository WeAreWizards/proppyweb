from unittest.mock import patch

from tests.common import DatabaseTest
from tests.factories._companies import CompanyFactory


class TestSlackIntegration(DatabaseTest):
    def setUp(self):
        super(TestSlackIntegration, self).setUp()
        self.company = CompanyFactory()
        self.url = "/slack_oauth?code=0000&state=%s" % str(self.company.id)

    @patch("slackclient.SlackClient.api_call")
    def test_can_receive_incoming_oauth(self, api_call_mock):
        api_call_mock.return_value = {
            "team_name": "Orlandoo Broom",
            "user_id": "UUUU",
            "team_id": "TTTT",
            "scope": "identify,incoming-webhook",
            "access_token": "oauth",
            "incoming_webhook": {
                "configuration_url": "https://orlandoobroom.slack.com/services/B34PUH6Q2",
                "url": "https://google.com",
                "channel_id": "G34QXHEUD",
                "channel": "slack-test"
            }
        }

        response = self.get(self.url)
        self.assertEqual(200, response.status_code)
        self.assertIsNotNone(self.company.slack)
        self.assertEqual(self.company.slack.channel, "slack-test")
        self.assertEqual(self.company.slack.token, "oauth")
