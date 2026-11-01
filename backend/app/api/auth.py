import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)
from sqlalchemy import func, select
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
from app.models.audit_log import AuditLog
from app.models.password_reset_otp import PasswordResetOTP
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.password_recovery import (
    AdminForgotPasswordRequest,
    AdminResetPasswordRequest,
    AdminVerifyOTPRequest,
    AdminVerifyOTPResponse,
)
from app.services.audit_service import record_audit_event
from app.services.email_service import send_admin_password_reset_otp


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

OTP_EXPIRE_MINUTES = max(
    1,
    min(30, int(os.getenv("OTP_EXPIRE_MINUTES", "5"))),
)

MAX_OTP_ATTEMPTS = 5
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_REQUESTS_PER_HOUR = 5
OTP_REQUESTS_PER_IP = 8
OTP_VERIFICATIONS_PER_IP = 30
OTP_RESETS_PER_IP = 20
RATE_LIMIT_WINDOW_MINUTES = 15


def get_client_ip(request: Request) -> str:
    # Do not trust client-supplied X-Forwarded-For headers.
    if request.client:
        return request.client.host
    return "unknown"


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def _recent_event_count(
    db: Session,
    *,
    action: str,
    since: datetime,
    ip_address: str | None = None,
    user_id: int | None = None,
) -> int:
    statement = select(func.count(AuditLog.id)).where(
        AuditLog.action == action,
        AuditLog.created_at >= since,
    )

    if ip_address is not None:
        statement = statement.where(
            AuditLog.ip_address == ip_address
        )

    if user_id is not None:
        statement = statement.where(
            AuditLog.user_id == user_id
        )

    return int(db.scalar(statement) or 0)


def _check_ip_limit(
    db: Session,
    request: Request,
    *,
    action: str,
    maximum: int,
) -> None:
    now = datetime.now(timezone.utc)
    ip_address = get_client_ip(request)

    count = _recent_event_count(
        db,
        action=action,
        ip_address=ip_address,
        since=now - timedelta(
            minutes=RATE_LIMIT_WINDOW_MINUTES
        ),
    )

    record_audit_event(
        action=action,
        resource_type="authentication",
        details="Administrator recovery endpoint request",
        ip_address=ip_address,
    )

    if count >= maximum:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Too many requests. "
                "Please try again later."
            ),
            headers={
                "Retry-After": str(
                    RATE_LIMIT_WINDOW_MINUTES * 60
                )
            },
        )


@router.post(
    "/login",
    response_model=TokenResponse,
)
def login(
    credentials: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    client_ip = get_client_ip(request)

    email = credentials.email.strip().lower()

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email cannot be empty",
        )

    user = db.scalar(
        select(User).where(
            func.lower(User.email) == email
        )
    )

    if user is None:
        record_audit_event(
            action="LOGIN_FAILED",
            resource_type="authentication",
            details=f"Login failed for email: {email}",
            ip_address=client_ip,
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not verify_password(
        credentials.password,
        user.password_hash,
    ):
        record_audit_event(
            action="LOGIN_FAILED",
            user_id=user.id,
            resource_type="authentication",
            details="Invalid password attempt",
            ip_address=client_ip,
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        record_audit_event(
            action="LOGIN_FAILED",
            user_id=user.id,
            resource_type="authentication",
            details="Inactive account attempted login",
            ip_address=client_ip,
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    access_token = create_access_token(user.id)

    record_audit_event(
        action="LOGIN_SUCCESS",
        user_id=user.id,
        resource_type="authentication",
        details=f"Successful login as {user.role.name}",
        ip_address=client_ip,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
    )


@router.post("/admin-forgot-password")
def admin_forgot_password(
    recovery_data: AdminForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    _check_ip_limit(
        db,
        request,
        action="ADMIN_PASSWORD_OTP_REQUESTED",
        maximum=OTP_REQUESTS_PER_IP,
    )

    generic_message = {
        "message": (
            "If a matching Administrator account exists, "
            "an OTP has been sent."
        )
    }

    email = recovery_data.email.strip().lower()

    if not email:
        return generic_message

    user = db.scalar(
        select(User)
        .where(func.lower(User.email) == email)
        .with_for_update()
    )

    if (
        user is None
        or not user.is_active
        or user.role.name != "Administrator"
    ):
        return generic_message

    now = datetime.now(timezone.utc)

    last_sent = db.scalar(
        select(func.max(AuditLog.created_at)).where(
            AuditLog.user_id == user.id,
            AuditLog.action == "ADMIN_PASSWORD_OTP_SENT",
        )
    )

    hourly_count = _recent_event_count(
        db,
        action="ADMIN_PASSWORD_OTP_SENT",
        user_id=user.id,
        since=now - timedelta(hours=1),
    )

    if hourly_count >= OTP_REQUESTS_PER_HOUR:
        return generic_message

    if (
        last_sent is not None
        and _utc(last_sent)
        > now - timedelta(
            seconds=OTP_RESEND_COOLDOWN_SECONDS
        )
    ):
        return generic_message

    otp = f"{secrets.randbelow(1_000_000):06d}"

    otp_record = PasswordResetOTP(
        user_id=user.id,
        otp_hash=hash_otp(otp),
        attempts=0,
        expires_at=now + timedelta(
            minutes=OTP_EXPIRE_MINUTES
        ),
    )

    try:
        send_admin_password_reset_otp(
            to_email=user.email,
            otp=otp,
            expires_minutes=OTP_EXPIRE_MINUTES,
        )
    except Exception:
        db.rollback()

        record_audit_event(
            action="ADMIN_PASSWORD_OTP_DELIVERY_FAILED",
            user_id=user.id,
            resource_type="authentication",
            details=(
                "OTP delivery failed; "
                "check SMTP configuration"
            ),
            ip_address=get_client_ip(request),
        )

        return generic_message

    # Revoke older OTPs and their reset sessions.
    old_otps = db.scalars(
        select(PasswordResetOTP)
        .where(
            PasswordResetOTP.user_id == user.id
        )
        .with_for_update()
    ).all()

    for old_otp in old_otps:
        db.delete(old_otp)

    db.add(otp_record)
    db.commit()

    record_audit_event(
        action="ADMIN_PASSWORD_OTP_SENT",
        user_id=user.id,
        resource_type="authentication",
        resource_id=user.id,
        details="Administrator password reset OTP sent",
        ip_address=get_client_ip(request),
    )

    return generic_message


@router.post(
    "/admin-verify-otp",
    response_model=AdminVerifyOTPResponse,
)
def admin_verify_otp(
    verification_data: AdminVerifyOTPRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    _check_ip_limit(
        db,
        request,
        action="ADMIN_PASSWORD_OTP_VERIFY_REQUESTED",
        maximum=OTP_VERIFICATIONS_PER_IP,
    )

    email = verification_data.email.strip().lower()
    otp = verification_data.otp.strip()

    if (
        len(otp) != 6
        or not otp.isascii()
        or not otp.isdigit()
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    user = db.scalar(
        select(User).where(
            func.lower(User.email) == email
        )
    )

    if (
        user is None
        or not user.is_active
        or user.role.name != "Administrator"
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    now = datetime.now(timezone.utc)

    otp_record = db.scalar(
        select(PasswordResetOTP)
        .where(
            PasswordResetOTP.user_id == user.id,
            PasswordResetOTP.used_at.is_(None),
        )
        .order_by(PasswordResetOTP.id.desc())
        .with_for_update()
    )

    if otp_record is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    if (
        _utc(otp_record.expires_at) <= now
        or otp_record.attempts >= MAX_OTP_ATTEMPTS
    ):
        otp_record.used_at = now
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    if not verify_otp_hash(
        otp,
        otp_record.otp_hash,
    ):
        otp_record.attempts += 1

        if otp_record.attempts >= MAX_OTP_ATTEMPTS:
            otp_record.used_at = now

        db.commit()

        record_audit_event(
            action="ADMIN_PASSWORD_OTP_FAILED",
            user_id=user.id,
            resource_type="authentication",
            resource_id=user.id,
            details="Invalid Administrator password reset OTP",
            ip_address=get_client_ip(request),
        )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP",
        )

    # Consume OTP before issuing the reset token.
    otp_record.used_at = now
    db.commit()

    reset_token = create_password_reset_token(
        user_id=user.id,
        otp_id=otp_record.id,
    )

    record_audit_event(
        action="ADMIN_PASSWORD_OTP_VERIFIED",
        user_id=user.id,
        resource_type="authentication",
        resource_id=user.id,
        details="Administrator password reset OTP verified",
        ip_address=get_client_ip(request),
    )

    return AdminVerifyOTPResponse(
        reset_token=reset_token,
        token_type="bearer",
    )


@router.post("/admin-reset-password")
def admin_reset_password(
    reset_data: AdminResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    _check_ip_limit(
        db,
        request,
        action="ADMIN_PASSWORD_RESET_REQUESTED",
        maximum=OTP_RESETS_PER_IP,
    )

    try:
        payload = decode_password_reset_token(
            reset_data.reset_token
        )

        user_id = int(payload["sub"])
        otp_id = int(payload["otp_id"])

    except (
        jwt.PyJWTError,
        ValueError,
        KeyError,
        TypeError,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired password reset token",
        )

    otp_record = db.scalar(
        select(PasswordResetOTP)
        .where(
            PasswordResetOTP.id == otp_id,
            PasswordResetOTP.user_id == user_id,
        )
        .with_for_update()
    )

    user = db.get(User, user_id)

    if (
        user is None
        or not user.is_active
        or user.role.name != "Administrator"
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired password reset token",
        )

    if (
        otp_record is None
        or otp_record.used_at is None
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired password reset token",
        )

    new_password = reset_data.new_password

    if (
        len(new_password) < 8
        or len(new_password.encode("utf-8")) > 72
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Password must be at least 8 characters "
                "and at most 72 UTF-8 bytes"
            ),
        )

    user.password_hash = hash_password(
        new_password
    )

    # Delete the OTP record to prevent reset token replay.
    db.delete(otp_record)
    db.commit()

    record_audit_event(
        action="ADMIN_PASSWORD_RESET_BY_OTP",
        user_id=user.id,
        resource_type="authentication",
        resource_id=user.id,
        details=(
            "Administrator password reset "
            "using verified OTP"
        ),
        ip_address=get_client_ip(request),
    )

    return {
        "message": (
            "Administrator password reset successfully"
        )
    }


@router.get("/verify")
def verify_authentication(
    current_user: User = Depends(get_current_user),
):
    return {
        "authenticated": True,
        "user_id": current_user.id,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role.name,
        "department_id": current_user.department_id,
        "is_active": current_user.is_active,
    }


@router.get("/admin-check")
def verify_administrator(
    current_user: User = Depends(
        require_role("Administrator")
    ),
):
    return {
        "authorized": True,
        "role": current_user.role.name,
    }