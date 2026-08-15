from datetime import datetime, timedelta, timezone

from fastapi import (
    APIRouter,
    Depends,
    Query,
)
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit import (
    AuditLogResponse,
    SecurityAlertResponse,
)


router = APIRouter(
    prefix="/security-monitoring",
    tags=["Security Monitoring"]
)


FAILED_LOGIN_THRESHOLD = 5
FAILED_LOGIN_WINDOW_MINUTES = 10

UNAUTHORIZED_ACCESS_WINDOW_MINUTES = 60


def build_audit_response(
    audit_log: AuditLog,
    username: str | None
) -> dict:

    return {
        "id": audit_log.id,
        "user_id": audit_log.user_id,
        "username": username,
        "action": audit_log.action,
        "resource_type": audit_log.resource_type,
        "resource_id": audit_log.resource_id,
        "details": audit_log.details,
        "ip_address": audit_log.ip_address,
        "created_at": audit_log.created_at,
    }


@router.get(
    "/recent-logs",
    response_model=list[AuditLogResponse]
)
def get_recent_logs(
    limit: int = Query(
        default=50,
        ge=1,
        le=200
    ),
    current_user: User = Depends(
        require_role("Security Officer")
    ),
    db: Session = Depends(get_db)
):
    statement = (
        select(
            AuditLog,
            User.username
        )
        .outerjoin(
            User,
            AuditLog.user_id == User.id
        )
        .order_by(
            AuditLog.created_at.desc()
        )
        .limit(limit)
    )

    rows = db.execute(
        statement
    ).all()

    return [
        build_audit_response(
            audit_log,
            username
        )
        for audit_log, username in rows
    ]


@router.get(
    "/failed-logins",
    response_model=list[AuditLogResponse]
)
def get_failed_logins(
    limit: int = Query(
        default=50,
        ge=1,
        le=200
    ),
    current_user: User = Depends(
        require_role("Security Officer")
    ),
    db: Session = Depends(get_db)
):
    statement = (
        select(
            AuditLog,
            User.username
        )
        .outerjoin(
            User,
            AuditLog.user_id == User.id
        )
        .where(
            AuditLog.action == "LOGIN_FAILED"
        )
        .order_by(
            AuditLog.created_at.desc()
        )
        .limit(limit)
    )

    rows = db.execute(
        statement
    ).all()

    return [
        build_audit_response(
            audit_log,
            username
        )
        for audit_log, username in rows
    ]


@router.get(
    "/unauthorized-access",
    response_model=list[AuditLogResponse]
)
def get_unauthorized_access(
    limit: int = Query(
        default=50,
        ge=1,
        le=200
    ),
    current_user: User = Depends(
        require_role("Security Officer")
    ),
    db: Session = Depends(get_db)
):
    statement = (
        select(
            AuditLog,
            User.username
        )
        .outerjoin(
            User,
            AuditLog.user_id == User.id
        )
        .where(
            AuditLog.action
            == "UNAUTHORIZED_ACCESS"
        )
        .order_by(
            AuditLog.created_at.desc()
        )
        .limit(limit)
    )

    rows = db.execute(
        statement
    ).all()

    return [
        build_audit_response(
            audit_log,
            username
        )
        for audit_log, username in rows
    ]


@router.get(
    "/alerts",
    response_model=list[SecurityAlertResponse]
)
def get_security_alerts(
    current_user: User = Depends(
        require_role("Security Officer")
    ),
    db: Session = Depends(get_db)
):
    now = datetime.now(
        timezone.utc
    )

    alerts = []

    failed_login_start = (
        now
        - timedelta(
            minutes=FAILED_LOGIN_WINDOW_MINUTES
        )
    )

    failed_login_statement = (
        select(
            AuditLog.ip_address,
            func.count(AuditLog.id).label(
                "event_count"
            ),
            func.min(
                AuditLog.created_at
            ).label(
                "first_detected"
            ),
            func.max(
                AuditLog.created_at
            ).label(
                "last_detected"
            ),
        )
        .where(
            AuditLog.action
            == "LOGIN_FAILED",

            AuditLog.created_at
            >= failed_login_start,

            AuditLog.ip_address.is_not(
                None
            ),
        )
        .group_by(
            AuditLog.ip_address
        )
        .having(
            func.count(AuditLog.id)
            >= FAILED_LOGIN_THRESHOLD
        )
    )

    failed_login_rows = db.execute(
        failed_login_statement
    ).all()

    for row in failed_login_rows:
        alerts.append(
            {
                "alert_type":
                    "REPEATED_FAILED_LOGIN",

                "severity":
                    "HIGH",

                "ip_address":
                    row.ip_address,

                "event_count":
                    row.event_count,

                "message": (
                    f"{row.event_count} failed "
                    f"login attempts detected "
                    f"within "
                    f"{FAILED_LOGIN_WINDOW_MINUTES} "
                    f"minutes"
                ),

                "first_detected_at":
                    row.first_detected,

                "last_detected_at":
                    row.last_detected,
            }
        )

    unauthorized_start = (
        now
        - timedelta(
            minutes=(
                UNAUTHORIZED_ACCESS_WINDOW_MINUTES
            )
        )
    )

    unauthorized_statement = (
        select(
            AuditLog.ip_address,
            func.count(AuditLog.id).label(
                "event_count"
            ),
            func.min(
                AuditLog.created_at
            ).label(
                "first_detected"
            ),
            func.max(
                AuditLog.created_at
            ).label(
                "last_detected"
            ),
        )
        .where(
            AuditLog.action
            == "UNAUTHORIZED_ACCESS",

            AuditLog.created_at
            >= unauthorized_start,
        )
        .group_by(
            AuditLog.ip_address
        )
    )

    unauthorized_rows = db.execute(
        unauthorized_statement
    ).all()

    for row in unauthorized_rows:
        alerts.append(
            {
                "alert_type":
                    "UNAUTHORIZED_ACCESS",

                "severity":
                    "MEDIUM",

                "ip_address":
                    row.ip_address,

                "event_count":
                    row.event_count,

                "message": (
                    f"{row.event_count} "
                    f"unauthorized access "
                    f"attempt(s) detected within "
                    f"{UNAUTHORIZED_ACCESS_WINDOW_MINUTES} "
                    f"minutes"
                ),

                "first_detected_at":
                    row.first_detected,

                "last_detected_at":
                    row.last_detected,
            }
        )

    alerts.sort(
        key=lambda alert:
            alert["last_detected_at"],
        reverse=True
    )

    return alerts