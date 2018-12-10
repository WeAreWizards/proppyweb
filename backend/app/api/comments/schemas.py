from marshmallow import Schema, fields, validates_schema, ValidationError
from ...decorators import current_user


class CommentSchema(Schema):
    thread_id = fields.Int(required=False, load_from="threadId")
    block_uid = fields.UUID(required=False, load_from="blockUid")
    comment = fields.Str(required=True)

    @validates_schema
    def validate_fields_presence(self, data):
        if "thread_id" not in data and "block_uid" not in data:
            raise ValidationError("No thread or block id given.")


class SharedCommentSchema(Schema):
    thread_id = fields.Int(required=False, load_from="threadId")
    block_uid = fields.UUID(required=False, load_from="blockUid")
    username = fields.Str(required=False)
    comment = fields.Str(required=True)

    @validates_schema
    def validate_fields_presence(self, data):
        if "thread_id" not in data and "block_uid" not in data:
            raise ValidationError("No thread or block id given.")

        if not current_user and "username" not in data:
            raise ValidationError("Username required for anonymous commenters")
