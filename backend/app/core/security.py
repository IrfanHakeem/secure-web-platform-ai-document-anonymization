import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from dotenv import load_dotenv


load_dotenv()


JWT_SECRET_KEY = os.getenv(
    "JWT_SECRET_KEY"
)

JWT_ALGORITHM = os.getenv(
    "JWT_ALGORITHM",
    "HS256"
)

JWT_EXPIRE_MINUTES = int(
    os.getenv(
        "JWT_EXPIRE_MINUTES",
        "60"
    )
)

PASSWORD_RESET_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "PASSWORD_RESET_TOKEN_EXPIRE_MINUTES",
        "10"
    )
)


if not JWT_SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY is not configured."
    )


def hash_password(
    password: str
) -> str:

    password_bytes = (
        password.encode("utf-8")
    )

    hashed_password = bcrypt.hashpw(
        password_bytes,
        bcrypt.gensalt()
    )

    return hashed_password.decode(
        "utf-8"
    )


def verify_password(
    plain_password: str,
    password_hash: str
) -> bool:

    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        password_hash.encode("utf-8")
    )


def create_access_token(
    user_id: int
) -> str:

    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=JWT_EXPIRE_MINUTES
        )
    )

    payload = {
        "sub": str(user_id),
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )


def decode_access_token(
    token: str
) -> dict:

    return jwt.decode(
        token,
        JWT_SECRET_KEY,
        algorithms=[JWT_ALGORITHM]
    )


def hash_otp(
    otp: str
) -> str:

    return hmac.new(
        JWT_SECRET_KEY.encode("utf-8"),
        otp.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_otp_hash(
    otp: str,
    stored_hash: str
) -> bool:

    calculated_hash = hash_otp(
        otp
    )

    return hmac.compare_digest(
        calculated_hash,
        stored_hash
    )


def create_password_reset_token(
    user_id: int,
    otp_id: int
) -> str:

    expires_at = (
        datetime.now(timezone.utc)
        + timedelta(
            minutes=(
                PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
            )
        )
    )

    payload = {
        "sub": str(user_id),
        "otp_id": otp_id,
        "purpose":
            "admin_password_reset",
        "exp": expires_at,
    }

    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm=JWT_ALGORITHM
    )


def decode_password_reset_token(
    token: str
) -> dict:

    payload = jwt.decode(
        token,
        JWT_SECRET_KEY,
        algorithms=[JWT_ALGORITHM]
    )

    if (
        payload.get("purpose")
        != "admin_password_reset"
    ):
        raise jwt.InvalidTokenError(
            "Invalid reset token purpose"
        )

    return payload