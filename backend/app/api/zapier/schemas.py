from marshmallow import (
    Schema, fields, validate
)

from ...models.zapier import Trigger

VALID_EVENTS = list(x.value for x in Trigger) # type: ignore

class Subscribe(Schema):
    target_url = fields.String(required=True)
    subscription_url = fields.String(required=False)
    event = fields.String(required=True, validate=[validate.OneOf(VALID_EVENTS)])


class CreateProposal(Schema):
    title = fields.String(required=False)
