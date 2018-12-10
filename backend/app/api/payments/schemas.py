from marshmallow import Schema, fields


class SubscribeSchema(Schema):
    plan = fields.String(required=True)


class InvoiceDownloadSchema(Schema):
    invoice_id = fields.String(required=True, load_from="invoiceId")
