from app.models.companies import Company
from app.models.users import User
from app.setup import mail

from tests.common import DatabaseTest
from tests.factories._users import UserFactory, InvitedUserFactory, ResetPasswordUserFactory


class TestFirstUserSignupViews(DatabaseTest):
    first_user = dict(
        username="Bob",
        email="bobby@tables.com",
        password="password",
        companyName="ACME"
    )

    def test_ok(self):
        with mail.record_messages() as outbox:
            data, status_code = self.post_json("/users", self.first_user)
            user = User.query.first()
            company = Company.query.first()

            self.assertEqual(len(outbox), 1)
            self.assertIn("Activate", outbox[0].subject)
            self.assertEqual(status_code, 201)
            self.assertEqual(data["user"]["username"], self.first_user["username"])
            self.assertEqual(company.name, self.first_user["companyName"])
            self.assertTrue(user.verify_password("password"))
            self.assertEqual(data["user"]["companyId"], company.id)
            # The onboarding one
            self.assertEqual(company.proposals.count(), 1)

            self.assertEqual(user.utm_source, "not-set")

    def test_email_used(self):
        UserFactory(email=self.first_user["email"])
        data, status_code = self.post_json("/users", self.first_user)

        self.assertEqual(status_code, 400)
        self.assertIn("in use", data["errors"]["email"][0])

    def test_case_insensitive_also_counts_as_used(self):
        upper = self.first_user["email"].upper()
        self.assertNotEqual(upper, self.first_user["email"])

        UserFactory(email=upper)
        data, status_code = self.post_json("/users", self.first_user)

        self.assertEqual(status_code, 400)
        self.assertIn("in use", data["errors"]["email"][0])

    def test_invalid_data(self):
        invalid_user = self.first_user.copy()
        invalid_user["password"] = "short"
        data, status_code = self.post_json("/users", invalid_user)

        self.assertEqual(status_code, 400)
        self.assertIn("Length", data["errors"]["password"][0])

    def test_resend_activation_mail_ok(self):
        u = UserFactory(email=self.first_user["email"], activation_token=b'ere')
        with mail.record_messages() as outbox:
            data, status_code = self.post_json(
                "/resend-activation-email", {"email": u.email}
            )
            self.assertEqual(status_code, 200)
            self.assertEqual(len(outbox), 1)
            self.assertIn("Activate", outbox[0].subject)

    def test_resend_activation_mail_already_active(self):
        u = UserFactory(email=self.first_user["email"])
        with mail.record_messages() as outbox:
            data, status_code = self.post_json(
                "/resend-activation-email", {"email": u.email}
            )
            self.assertEqual(status_code, 400)
            self.assertEqual(len(outbox), 0)


class TestInvitedUserSignup(DatabaseTest):
    def setUp(self):
        super(TestInvitedUserSignup, self).setUp()
        self.user = InvitedUserFactory()
        self.post_data = {
            "username": "bobby",
            "password": "password",
            "token": self.user.activation_token.decode("utf-8")
        }

    def test_ok(self):
        _, status_code = self.post_json("/invited-users", self.post_data)

        self.assertEqual(status_code, 200)
        user = User.query.first()
        self.assertTrue(user.verify_password("password"))
        self.assertTrue(user.is_active)

    def test_invalid_token(self):
        invalid_data = self.post_data.copy()
        invalid_data["token"] = invalid_data["token"][:50]
        data, status_code = self.post_json("/invited-users", invalid_data)

        self.assertEqual(status_code, 400)
        self.assertIn("not found", data["errors"]["token"][0])


class TestActivateUser(DatabaseTest):
    def setUp(self):
        super(TestActivateUser, self).setUp()
        self.user = InvitedUserFactory()
        self.token = self.user.activation_token.decode("utf-8")

    def test_ok(self):
        _, status_code = self.post_json("/activate/%s" % self.token, {})

        self.assertEqual(status_code, 200)
        user = User.query.first()
        self.assertEqual(user.id, self.user.id)
        self.assertTrue(user.is_active)

    def test_invalid_token(self):
        _, status_code = self.post_json("/activate/%s" % self.token[:50], {})

        self.assertEqual(status_code, 400)


class TestRequestResetPassword(DatabaseTest):
    def setUp(self):
        super(TestRequestResetPassword, self).setUp()
        self.user = UserFactory()

    def test_ok(self):
        with mail.record_messages() as outbox:
            _, status_code = self.post_json("/request-reset-password", {"email": self.user.email})

            self.assertEqual(len(outbox), 1)
            self.assertIn("Reset", outbox[0].subject)
            self.assertEqual(status_code, 200)

    def test_unknown_email(self):
        data, status_code = self.post_json("/request-reset-password", {"email": "yo@ga.com"})

        self.assertEqual(status_code, 400)
        self.assertIn("not in", data["errors"]["email"][0])


class TestResetPassword(DatabaseTest):
    def setUp(self):
        super(TestResetPassword, self).setUp()
        self.user = ResetPasswordUserFactory()
        self.post_data = {
            "password": "hunter2hunter2",
            "token": self.user.reset_password_token.decode("utf-8")
        }

    def test_ok(self):
        _, status_code = self.post_json("/reset-password", self.post_data)
        self.assertEqual(status_code, 200)
        user = User.query.get(self.user.id)

        self.assertTrue(user.verify_password(self.post_data["password"]))

    def test_invalid_token(self):
        invalid_data = self.post_data.copy()
        invalid_data["token"] = invalid_data["token"][:50]
        _, status_code = self.post_json("/reset-password", invalid_data)
        self.assertEqual(status_code, 400)


class TestMe(DatabaseTest):
    def setUp(self):
        super(TestMe, self).setUp()
        self.user = UserFactory()
        self.url = "/me"

    def test_logged_in(self):
        response = self.get(self.url, user=self.user)

        self.assertEqual(response.status_code, 200)

    def test_logged_out(self):
        response = self.get(self.url)

        self.assertEqual(response.status_code, 401)


class TestLogin(DatabaseTest):
    def setUp(self):
        super(TestLogin, self).setUp()
        self.user = UserFactory()
        self.url = "/tokens"
        self.post_data = {
            "password": "password",
            "email": self.user.email
        }

    def test_ok(self):
        data, status_code = self.post_json(self.url, self.post_data)
        self.assertEqual(status_code, 201)
        self.assertEqual(data["user"]["username"], self.user.username)

    def test_invalid_password(self):
        invalid = self.post_data.copy()
        invalid["password"] = "heytryintohack"
        data, status_code = self.post_json(self.url, invalid)
        self.assertEqual(status_code, 401)


class TestInvite(DatabaseTest):
    def setUp(self):
        super(TestInvite, self).setUp()
        self.user = UserFactory()

    def test_ok(self):
        with mail.record_messages() as outbox:
            email = "bob@yolo.com"
            data, status_code = self.post_json(
                "/invites", {"email": email}, user=self.user
            )

            self.assertEqual(status_code, 201)
            self.assertEqual(len(outbox), 1)
            self.assertIn("invited", outbox[0].subject)
            u = User.query.filter_by(email=email).first()
            self.assertNotEqual(u.activation_token, b"")
            self.assertNotEqual(u.password, b"")

    def test_already_exists(self):
        with mail.record_messages() as outbox:
            data, status_code = self.post_json(
                "/invites", {"email": self.user.email}, user=self.user
            )

            self.assertEqual(status_code, 400)
            self.assertEqual(len(outbox), 0)

    def test_resend_ok(self):
        with mail.record_messages() as outbox:
            email = UserFactory(company=self.user.company, activation_token=b'1212').email
            data, status_code = self.post_json(
                "/resend-invite", {"email": email}, user=self.user
            )

            self.assertEqual(status_code, 200)
            self.assertEqual(len(outbox), 1)
            self.assertIn("invited", outbox[0].subject)

    def test_resend_fail_already_active(self):
        with mail.record_messages() as outbox:
            email = UserFactory(company=self.user.company).email
            data, status_code = self.post_json(
                "/resend-invite", {"email": email}, user=self.user
            )

            self.assertEqual(status_code, 400)
            self.assertEqual(len(outbox), 0)

    def test_resend_fail_different_company(self):
        with mail.record_messages() as outbox:
            email = UserFactory(activation_token=b'1212').email
            data, status_code = self.post_json(
                "/resend-invite", {"email": email}, user=self.user
            )

            self.assertEqual(status_code, 404)
            self.assertEqual(len(outbox), 0)


class TestDisableUser(DatabaseTest):
    def setUp(self):
        super(TestDisableUser, self).setUp()
        self.admin = UserFactory(is_admin=True)
        self.user = UserFactory(company=self.admin.company)
        self.url = "/disable-user/%d"

    def test_disable_user_other_company_fail(self):
        user = UserFactory()
        _, code = self.post_json(self.url % user.id, {}, user=self.user)

        self.assertEqual(code, 400)
        self.assertFalse(user.disabled)

    def test_disable_without_being_admin_fail(self):
        _, code = self.post_json(self.url % self.admin.id, {}, user=self.user)

        self.assertEqual(code, 400)
        self.assertFalse(self.admin.disabled)

    def test_disable_normal_user(self):
        _, code = self.post_json(self.url % self.user.id, {}, user=self.admin)

        self.assertEqual(code, 200)
        self.assertTrue(self.user.disabled)


class TestToggleAdminUser(DatabaseTest):
    def setUp(self):
        super(TestToggleAdminUser, self).setUp()
        self.admin = UserFactory(is_admin=True)
        self.user = UserFactory(company=self.admin.company)
        self.url = "/toggle-user-admin/%d"

    def test_toggle_admin_other_company_fail(self):
        user = UserFactory()
        _, code = self.post_json(self.url % user.id, {}, user=self.user)

        self.assertEqual(code, 400)
        self.assertFalse(user.is_admin)

    def test_toggle_admin_without_being_admin_fail(self):
        _, code = self.post_json(self.url % self.user.id, {}, user=self.user)

        self.assertEqual(code, 400)
        self.assertFalse(self.user.is_admin)

    def test_change_normal_user_to_admin(self):
        _, code = self.post_json(self.url % self.user.id, {}, user=self.admin)

        self.assertEqual(code, 200)
        self.assertTrue(self.user.is_admin)

    def test_unadmin_only_admin_fail(self):
        _, code = self.post_json(self.url % self.admin.id, {}, user=self.admin)

        self.assertEqual(code, 400)
        self.assertTrue(self.admin.is_admin)
