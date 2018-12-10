# TODO encode all blocks we have so we can verify them before sending
# them to the database.
textblock = {
    "type": "object",
    "properties": {
        # 128KB for one paragraph gotta be enough
        "value": {"type" : "string", "maxLength": 2**17},
    },
    "required": ["value"],
}

data = {
    "type": "object",
    "oneOf": [
        textblock,
    ],
}

block ={
    "type": "object",
    "properties": {
        "data": data,
        "ordering": {"type": "integer"},
        "proposalId": {"type": "integer"},
        "type": {"type": "string"},
        "uid": {"type": "string"},
    },
    "required": ["data", "ordering", "type", "uid"],
}

blocks = {
    "type": "array",
    "items": {
        "type": "object",
        "oneOf": [
            block,
        ],
    },
}

# Collect enough identifying information to make sure the client
# really signed the thing.
signed_proposal_v1 = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "version": {"type": "integer"},
        "createdAt": {"type": "integer"},
        "blocks": blocks,
        "fromIp": {"type": "string"},
        "signatureImage": {"type": "string"},
        "userAgent": {"type": "string"},

        "coverImageUrl": {"type": "string"},
        "nameTyped": {"type": "string"},
    },
    "required": ["title", "version", "createdAt", "blocks", "nameTyped", "fromIp", "signatureImage", "userAgent"],
}
