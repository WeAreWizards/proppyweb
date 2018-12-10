from tests.common import DatabaseTest
from tests.factories._users import UserFactory


class TestCompaniesUpdate(DatabaseTest):
    def setUp(self):
        super(TestCompaniesUpdate, self).setUp()
        self.user = UserFactory()
        self.url = "/companies/branding"
        self.branding = {
            "fontHeaders": "Lato",
            "fontBody": "Tisa",
            "primaryColour": "#40C181",
            "bgColour": "#fff",
            "textColour": "#454B4F",
        }

    def test_update_branding_valid(self):
        branding = self.branding.copy()
        branding["primaryColour"] = "#ccc"
        _, status = self.post_json(self.url, {"branding": branding}, user=self.user)
        self.assertEqual(status, 200)
        self.assertEqual(self.user.company.branding["primaryColour"], "#ccc")

    def test_update_branding_unknown_font(self):
        branding = self.branding.copy()
        branding["fontHeaders"] = "#YOLO FONT"
        _, status = self.post_json(self.url, {"branding": branding}, user=self.user)
        self.assertEqual(status, 400)

    def test_update_branding_invalid_colour(self):
        branding = self.branding.copy()
        branding["primaryColour"] = "#cccc"
        _, status = self.post_json(self.url, {"branding": branding}, user=self.user)
        self.assertEqual(status, 400)
