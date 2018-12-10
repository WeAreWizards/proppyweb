from marshmallow import Schema, fields


class BlockSchema(Schema):
    # TODO: add a field type for enum?
    type = fields.String(required=True)
    proposal_id = fields.Integer(required=True, load_from="proposalId")
    uid = fields.UUID(required=True)
    data = fields.Dict(required=True)
    version = fields.Integer(required=True)


class StatusSchema(Schema):
    # TODO: add a field type for enum?
    status = fields.String(required=True)


class ShareSchema(Schema):
    emails = fields.List(fields.Email, required=True)
    note = fields.String(required=False)


class UpdateProposalSchema(Schema):
    title = fields.String(required=True)
    tags = fields.List(fields.String, required=True)
    cover_image_url = fields.String(required=True, load_from="coverImageUrl")
    updated_at = fields.Integer(required=True, load_from="updatedAt")
    client_id = fields.Integer(required=False, load_from="clientId", allow_none=True)
    client_name = fields.String(required=False, load_from="clientName", allow_none=True)
    blocks = fields.Nested(BlockSchema, many=True)


class ImportSectionSchema(Schema):
    uidToImport = fields.UUID(required=True)
