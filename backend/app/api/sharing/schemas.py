from marshmallow import Schema, fields, validate


class ShareSchema(Schema):
    emails = fields.List(fields.Email, required=True, validate=validate.Length(min=1))
    body = fields.String(required=True)
    subject = fields.String(required=True)
    from_name = fields.String(required=True, load_from="from")


class SigningSchema(Schema):
    name = fields.String(required=True)
    signature = fields.String(required=True)
    user_agent = fields.String(required=True, load_from="userAgent")

