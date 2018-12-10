from marshmallow import Schema, fields


class SlackEvents(Schema):
    post_on_view = fields.Boolean(required=True, load_from="postOnView")
    post_on_comment = fields.Boolean(required=True, load_from="postOnComment")
    post_on_signature = fields.Boolean(required=True, load_from="postOnSignature")


class IntegrationToken(Schema):
    name = fields.String(required=True)
    token = fields.String(required=True)


class RemoveIntegrationToken(Schema):
    name = fields.String(required=True)
