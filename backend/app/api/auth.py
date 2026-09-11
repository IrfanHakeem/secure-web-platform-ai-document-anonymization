import os
import secrets
from datetime import (
    datetime,
    timedelta,
    timezone,
)

import jwt
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)
from sqlalchemy import (
    func,
    select,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    get_current_user,
    require_role,
)
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    decode_password_reset_token,
    hash_otp,
    hash_password,
    verify_otp_hash,
    verify_password,
)
from app.models.password_reset_otp import (
    PasswordResetOTP,
)
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
)
from app.schemas.password_recovery import (
    AdminForgotPasswordRequest,
    AdminResetPasswordRequest,
    AdminVerifyOTPRequest,
    AdminVerifyOTPResponse,
)
from app.services.audit_service import (
    record_audit_event,
)
from app.services.email_service import (
    send_admin_password_reset_otp,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


OTP_EXPIRE_MINUTES = int(
    os.getenv(
        "OTP_EXPIRE_MINUTES",
        "10"
    )
)

MAX_OTP_ATTEMPTS = 5


def get_client_ip(
    request: Request
) -> str | None:

    if request.client is None:
        return None

    return request.client.host


@router.post(
    "/login",
    response_model=TokenResponse
)
def login(
    credentials: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    client_ip = get_client_ip(
        request
    )

    email = (
        credentials.email
        .strip()
        .lower()
    )

    if not email:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail="Email cannot be empty"
        )

    user = db.scalar(
        select(User).where(
            func.lower(
                User.email
            ) == email
        )
    )

    if user is None:
        record_audit_event(
            action="LOGIN_FAILED",
            user_id=None,
            resource_type="authentication",
            details=(
                "Login failed for email: "
                f"{email}"
            ),
            ip_address=client_ip,
        )

        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid email or password"
            )
        )

    if not verify_password(
        credentials.password,
        user.password_hash
    ):
        record_audit_event(
            action="LOGIN_FAILED",
            user_id=user.id,
            resource_type="authentication",
            details=(
                "Invalid password attempt"
            ),
            ip_address=client_ip,
        )

        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid email or password"
            )
        )

    if not user.is_active:
        record_audit_event(
            action="LOGIN_FAILED",
            user_id=user.id,
            resource_type="authentication",
            details=(
                "Inactive account attempted login"
            ),
            ip_address=client_ip,
        )

        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "User account is inactive"
            )
        )

    access_token = create_access_token(
        user.id
    )

    record_audit_event(
        action="LOGIN_SUCCESS",
        user_id=user.id,
        resource_type="authentication",
        details=(
            f"Successful login as "
            f"{user.role.name}"
        ),
        ip_address=client_ip,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer"
    )


@router.post(
    "/admin-forgot-password"
)
def admin_forgot_password(
    recovery_data: AdminForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    email = (
        recovery_data.email
        .strip()
        .lower()
    )

    user = db.scalar(
        select(User).where(
            func.lower(
                User.email
            ) == email
        )
    )

    generic_message = {
        "message": (
            "If a matching Administrator "
            "account exists, an OTP has "
            "been sent."
        )
    }

    if (
        user is None
        or user.role.name
        != "Administrator"
    ):
        return generic_message

    now = datetime.now(
        timezone.utc
    )

    previous_otps = db.scalars(
        select(
            PasswordResetOTP
        ).where(
            PasswordResetOTP.user_id
            == user.id,
            PasswordResetOTP.used_at
            .is_(None),
        )
    ).all()

    for previous_otp in previous_otps:
        previous_otp.used_at = now

    otp = str(
        secrets.randbelow(
            900000
        ) + 100000
    )

    otp_record = PasswordResetOTP(
        user_id=user.id,
        otp_hash=hash_otp(
            otp
        ),
        attempts=0,
        expires_at=(
            now
            + timedelta(
                minutes=(
                    OTP_EXPIRE_MINUTES
                )
            )
        ),
    )

    try:
        send_admin_password_reset_otp(
            to_email=user.email,
            otp=otp,
        )

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=(
                "Unable to send password "
                "reset email"
            )
        )

    db.add(
        otp_record
    )

    db.commit()

    record_audit_event(
        action=(
            "ADMIN_PASSWORD_OTP_SENT"
        ),
        user_id=user.id,
        resource_type="authentication",
        resource_id=user.id,
        details=(
            "Administrator password "
            "reset OTP sent"
        ),
        ip_address=get_client_ip(
            request
        ),
    )

    return generic_message


@router.post(
    "/admin-verify-otp",
    response_model=(
        AdminVerifyOTPResponse
    )
)
def admin_verify_otp(
    verification_data: AdminVerifyOTPRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    email = (
        verification_data.email
        .strip()
        .lower()
    )

    otp = (
        verification_data.otp
        .strip()
    )

    if (
        len(otp) != 6
        or not otp.isdigit()
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Invalid or expired OTP"
            )
        )

    user = db.scalar(
        select(User).where(
            func.lower(
                User.email
            ) == email
        )
    )

    if (
        user is None
        or user.role.name
        != "Administrator"
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Invalid or expired OTP"
            )
        )

    now = datetime.now(
        timezone.utc
    )

    otp_record = db.scalar(
        select(
            PasswordResetOTP
        )
        .where(
            PasswordResetOTP.user_id
            == user.id,
            PasswordResetOTP.used_at
            .is_(None),
        )
        .order_by(
            PasswordResetOTP.id.desc()
        )
    )

    if otp_record is None:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Invalid or expired OTP"
            )
        )

    if otp_record.expires_at < now:
        otp_record.used_at = now

        db.commit()

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Invalid or expired OTP"
            )
        )

    if (
        otp_record.attempts
        >= MAX_OTP_ATTEMPTS
    ):
        otp_record.used_at = now

        db.commit()

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "OTP verification failed"
            )
        )

    if not verify_otp_hash(
        otp,
        otp_record.otp_hash
    ):
        otp_record.attempts += 1

        if (
            otp_record.attempts
            >= MAX_OTP_ATTEMPTS
        ):
            otp_record.used_at = now

        db.commit()

        record_audit_event(
            action=(
                "ADMIN_PASSWORD_OTP_FAILED"
            ),
            user_id=user.id,
            resource_type="authentication",
            resource_id=user.id,
            details=(
                "Invalid Administrator "
                "password reset OTP"
            ),
            ip_address=get_client_ip(
                request
            ),
        )

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Invalid or expired OTP"
            )
        )

    otp_record.used_at = now

    db.commit()

    reset_token = (
        create_password_reset_token(
            user_id=user.id,
            otp_id=otp_record.id,
        )
    )

    record_audit_event(
        action=(
            "ADMIN_PASSWORD_OTP_VERIFIED"
        ),
        user_id=user.id,
        resource_type="authentication",
        resource_id=user.id,
        details=(
            "Administrator password "
            "reset OTP verified"
        ),
        ip_address=get_client_ip(
            request
        ),
    )

    return (
        AdminVerifyOTPResponse(
            reset_token=reset_token,
            token_type="bearer",
        )
    )


@router.post(
    "/admin-reset-password"
)
def admin_reset_password(
    reset_data: AdminResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    try:
        payload = (
            decode_password_reset_token(
                reset_data.reset_token
            )
        )

        user_id = payload.get(
            "sub"
        )

        otp_id = payload.get(
            "otp_id"
        )

        if (
            user_id is None
            or otp_id is None
        ):
            raise ValueError

        user = db.get(
            User,
            int(user_id)
        )

        otp_record = db.get(
            PasswordResetOTP,
            int(otp_id)
        )

    except (
        jwt.ExpiredSignatureError,
        jwt.InvalidTokenError,
        ValueError,
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid or expired "
                "password reset token"
            )
        )

    if (
        user is None
        or user.role.name
        != "Administrator"
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "Administrator account "
                "required"
            )
        )

    if (
        otp_record is None
        or otp_record.user_id
        != user.id
        or otp_record.used_at
        is None
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid or expired "
                "password reset token"
            )
        )

    new_password = (
        reset_data.new_password
    )

    if not new_password:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "New password cannot "
                "be empty"
            )
        )

    if len(
        new_password.encode("utf-8")
    ) > 72:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Password is too long "
                "for bcrypt"
            )
        )

    user.password_hash = hash_password(
        new_password
    )

    db.delete(
        otp_record
    )

    db.commit()

    record_audit_event(
        action=(
            "ADMIN_PASSWORD_RESET_BY_OTP"
        ),
        user_id=user.id,
        resource_type="authentication",
        resource_id=user.id,
        details=(
            "Administrator password "
            "reset using verified OTP"
        ),
        ip_address=get_client_ip(
            request
        ),
    )

    return {
        "message": (
            "Administrator password "
            "reset successfully"
        )
    }


@router.get(
    "/verify"
)
def verify_authentication(
    current_user: User = Depends(
        get_current_user
    )
):
    return {
        "authenticated": True,
        "user_id":
            current_user.id,
        "username":
            current_user.username,
        "full_name":
            current_user.full_name,
        "email":
            current_user.email,
        "role":
            current_user.role.name,
        "department_id":
            current_user.department_id,
        "is_active":
            current_user.is_active,
    }


@router.get(
    "/admin-check"
)
def verify_administrator(
    current_user: User = Depends(
        require_role("Administrator")
    )
):
    return {
        "authorized": True,
        "role":
            current_user.role.name,
    }