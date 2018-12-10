import flask
import json
import unittest

from app.setup import db
from app.models.users import TokenType


class DatabaseTest(unittest.TestCase):
    def setUp(self):
        self.client = flask.current_app.test_client()

        for table in reversed(db.metadata.sorted_tables):
            db.engine.execute(table.delete())

    def tearDown(self):
        db.session.remove()

    def _send_json(self, url: str, payload, fn, user=None, extra_headers={}):
        """
        Just to avoid repeating dumping to json and setting the content_type
        """
        if user is None:
            headers = {}
        else:
            token = user.generate_jwt(TokenType.Login, 3600)
            headers = {"Authorization": "Bearer %s" % token.decode("utf-8")}

        headers.update(extra_headers)

        response = fn(
            url,
            data=json.dumps(payload),
            content_type="application/json",
            headers=headers,
            environ_base={'REMOTE_ADDR': '127.0.0.1'},
        )

        data = response.data.decode("utf-8")
        try:
            return json.loads(data), response.status_code
        except json.decoder.JSONDecodeError:
            # received non-json, ok most of the time, uncomment for details
            # print("\nTried to decode\n {!r} on url\n {!r}".format(data, url))
            return (), response.status_code

    def post_json(self, url: str, payload, user=None, extra_headers={}):
        return self._send_json(url, payload, self.client.post, user=user, extra_headers=extra_headers)

    def put_json(self, url: str, payload, user=None, extra_headers={}):
        return self._send_json(url, payload, self.client.put, user=user, extra_headers=extra_headers)

    def get(self, url: str, user=None):
        """Passing a user will create and use the jwt"""
        if user is None:
            return self.client.get(url)

        token = user.generate_jwt(TokenType.Login, 3600)
        return self.client.get(url, headers={"Authorization": "Bearer %s" % token.decode("utf-8")})

    def get_json(self, url: str, user=None):
        response = self.get(url, user=user)
        data = response.data.decode("utf-8")
        try:
            return json.loads(data), response.status_code
        except json.decoder.JSONDecodeError:
            print("\nTried to decode\n {!r} on url\n {!r}".format(data, url))
            raise

    def delete(self, url: str, user=None):
        if user is None:
            return self.client.delete(url)
        token = user.generate_jwt(TokenType.Login, 3600)
        return self.client.delete(url, headers={"Authorization": "Bearer %s" % token.decode("utf-8")})
