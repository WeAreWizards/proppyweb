"""
They key was created with
$ keyczart create --location=/tmp/keys --purpose=sign --name=proppy-signature-key --asymmetric=rsa
$ keyczart addkey --location=/tmp/keys --status=primary
"""
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB

from ..setup import db


class Signature(db.Model):
    """
    A signature captures hashes, inputs etc.

    """
    __tablename__ = "signatures"

    id = db.Column(db.Integer, primary_key=True)
    shared_proposal_id = db.Column(db.Integer, db.ForeignKey("shared_proposals.id"), nullable=False, index=True)
    proposal_id = db.Column(db.Integer, db.ForeignKey("proposals.id"), nullable=False, index=True)

    # The whole document encoded as one large JSON blob.
    document = db.Column(JSONB, nullable=False)

    # keyczar.Signer.Read('path/to/keys')
    # s.Sign("abc")
    keyczar_signature = db.Column(db.String(2048), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
