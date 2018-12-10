import random
import time
from typing import Dict, Tuple, Any, Union

from flask import current_app
import jwt


def create_expiring_jwt(claims: Dict[str, Any], expires_in=3600) -> bytes:
    claims.update({
        "exp": int(time.time()) + expires_in,
        "iat": int(time.time()),
        "iss": "proppy"
    })
    return jwt.encode(
        claims,
        current_app.config["SECRET_KEY"],
        algorithm="HS256"
    )

def decode_jwt(token: str) -> Tuple[bool, Union[str, Dict[str, Any]]]:
    """
    Decode a jwt token.
    Returns a tuple (success, claims|error)
    """
    try:
        claims = jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
        return True, claims
    except jwt.ExpiredSignatureError:
        return False, "expired"
    except jwt.InvalidIssuerError:
        return False, "issuer"
    except jwt.InvalidTokenError:
        return False, "invalid"


# FROM DJANGO: https://github.com/django/django/blob/master/django/utils/crypto.py
# Use the system PRNG if possible
system_random = random.SystemRandom()


def get_random_string(length=9):
    """
    Returns a securely generated random string.
    """
    allowed_chars='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    return ''.join(system_random.choice(allowed_chars) for i in range(length))
