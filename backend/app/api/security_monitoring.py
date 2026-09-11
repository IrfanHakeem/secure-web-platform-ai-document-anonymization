import hmac
import os
from datetime import (
    datetime,
    timedelta,
    timezone,
)

from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    Query,
    status,
)
from sqlalchemy import (
    func,
    select,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.audit_log import AuditLog
from app.models.network_security_event import (
    NetworkSecurityEvent,
)
from app.models.original_file_request import (
    OriginalFileRequest,
)
from app.models.user import User
from app.schemas.audit import (
    AuditLogResponse,
    SecurityAlertResponse,
)
from app.schemas.security_network import (
    NetworkMonitoringStatusResponse,
    NetworkSecurityEventCreate,
    NetworkSecurityEventResponse,
    SecurityDashboardSummaryResponse,
)


load_dotenv()


router = APIRouter(
    prefix="/security-monitoring",
    tags=["Security Monitoring"]
)


FAILED_LOGIN_THRESHOLD = 5
FAILED_LOGIN_WINDOW_MINUTES = 10

UNAUTHORIZED_ACCESS_WINDOW_MINUTES = 60

NETWORK_EVENT_ACTIVE_MINUTES = int(
    os.getenv(
        "NETWORK_EVENT_ACTIVE_MINUTES",
        "5"
    )
)


def build_audit_response(
    audit_log: AuditLog,
    username: str | None
) -> dict:

    return {
        "id":
            audit_log.id,

        "user_id":
            audit_log.user_id,

        "username":
            username,

        "action":
            audit_log.action,

        "resource_type":
            audit_log.resource_type,

        "resource_id":
            audit_log.resource_id,

        "details":
            audit_log.details,

        "ip_address":
            audit_log.ip_address,

        "created_at":
            audit_log.created_at,
    }


def build_network_event_response(
    network_event: NetworkSecurityEvent
) -> dict:

    return {
        "id":
            network_event.id,

        "sensor_name":
            network_event.sensor_name,

        "event_type":
            network_event.event_type,

        "severity":
            network_event.severity,

        "source_ip":
            network_event.source_ip,

        "destination_ip":
            network_event.destination_ip,

        "source_port":
            network_event.source_port,

        "destination_port":
            network_event.destination_port,

        "protocol":
            network_event.protocol,

        "signature":
            network_event.signature,

        "category":
            network_event.category,

        "details":
            network_event.details,

        "event_timestamp":
            network_event.event_timestamp,

        "received_at":
            network_event.received_at,
    }


def build_application_alerts(
    db: Session
) -> list[dict]:

    now = datetime.now(
        timezone.utc
    )

    alerts = []

    failed_login_start = (
        now
        - timedelta(
            minutes=(
                FAILED_LOGIN_WINDOW_MINUTES
            )
        )
    )

    failed_login_statement = (
        select(
            AuditLog.ip_address,

            func.count(
                AuditLog.id
            ).label(
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
            func.count(
                AuditLog.id
            )
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
                    f"{row.event_count} "
                    f"failed login attempts "
                    f"detected within "
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

            func.count(
                AuditLog.id
            ).label(
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
                    f"attempt(s) detected "
                    f"within "
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


def get_network_monitoring_status(
    db: Session
) -> dict:

    configured = bool(
        os.getenv(
            "NETWORK_SENSOR_API_KEY"
        )
    )

    total_events = (
        db.scalar(
            select(
                func.count(
                    NetworkSecurityEvent.id
                )
            )
        )
        or 0
    )

    last_event_at = db.scalar(
        select(
            func.max(
                NetworkSecurityEvent.event_timestamp
            )
        )
    )

    if not configured:

        monitoring_status = (
            "NOT_CONFIGURED"
        )

    elif last_event_at is None:

        monitoring_status = (
            "AWAITING_DATA"
        )

    else:

        active_threshold = (
            datetime.now(timezone.utc)
            - timedelta(
                minutes=(
                    NETWORK_EVENT_ACTIVE_MINUTES
                )
            )
        )

        if last_event_at >= active_threshold:

            monitoring_status = "ACTIVE"

        else:

            monitoring_status = "STALE"

    return {
        "status":
            monitoring_status,

        "integration_configured":
            configured,

        "total_events":
            total_events,

        "last_event_at":
            last_event_at,
    }


@router.get(
    "/recent-logs",
    response_model=list[
        AuditLogResponse
    ]
)
def get_recent_logs(
    limit: int = Query(
        default=50,
        ge=1,
        le=200
    ),
    current_user: User = Depends(
        require_role(
            "Security Officer"
        )
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
            AuditLog.user_id
            == User.id
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
        for audit_log, username
        in rows
    ]


@router.get(
    "/failed-logins",
    response_model=list[
        AuditLogResponse
    ]
)
def get_failed_logins(
    limit: int = Query(
        default=50,
        ge=1,
        le=200
    ),
    current_user: User = Depends(
        require_role(
            "Security Officer"
        )
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
            AuditLog.user_id
            == User.id
        )
        .where(
            AuditLog.action
            == "LOGIN_FAILED"
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
        for audit_log, username
        in rows
    ]


@router.get(
    "/unauthorized-access",
    response_model=list[
        AuditLogResponse
    ]
)
def get_unauthorized_access(
    limit: int = Query(
        default=50,
        ge=1,
        le=200
    ),
    current_user: User = Depends(
        require_role(
            "Security Officer"
        )
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
            AuditLog.user_id
            == User.id
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
        for audit_log, username
        in rows
    ]


@router.get(
    "/alerts",
    response_model=list[
        SecurityAlertResponse
    ]
)
def get_security_alerts(
    current_user: User = Depends(
        require_role(
            "Security Officer"
        )
    ),
    db: Session = Depends(get_db)
):
    return build_application_alerts(
        db
    )


@router.get(
    "/network-status",
    response_model=(
        NetworkMonitoringStatusResponse
    )
)
def network_monitoring_status(
    current_user: User = Depends(
        require_role(
            "Security Officer"
        )
    ),
    db: Session = Depends(get_db)
):
    return get_network_monitoring_status(
        db
    )


@router.get(
    "/network-events",
    response_model=list[
        NetworkSecurityEventResponse
    ]
)
def get_network_events(
    limit: int = Query(
        default=50,
        ge=1,
        le=200
    ),
    current_user: User = Depends(
        require_role(
            "Security Officer"
        )
    ),
    db: Session = Depends(get_db)
):
    events = db.scalars(
        select(
            NetworkSecurityEvent
        )
        .order_by(
            NetworkSecurityEvent
            .event_timestamp
            .desc()
        )
        .limit(limit)
    ).all()

    return [
        build_network_event_response(
            event
        )
        for event in events
    ]


@router.get(
    "/dashboard-summary",
    response_model=(
        SecurityDashboardSummaryResponse
    )
)
def get_dashboard_summary(
    current_user: User = Depends(
        require_role(
            "Security Officer"
        )
    ),
    db: Session = Depends(get_db)
):
    now = datetime.now(
        timezone.utc
    )

    start_24h = (
        now
        - timedelta(
            hours=24
        )
    )

    pending_original_reviews = (
        db.scalar(
            select(
                func.count(
                    OriginalFileRequest.id
                )
            ).where(
                OriginalFileRequest.status
                == "PENDING_SECURITY"
            )
        )
        or 0
    )

    application_alerts = len(
        build_application_alerts(
            db
        )
    )

    audit_logs_last_24h = (
        db.scalar(
            select(
                func.count(
                    AuditLog.id
                )
            ).where(
                AuditLog.created_at
                >= start_24h
            )
        )
        or 0
    )

    network_events_last_24h = (
        db.scalar(
            select(
                func.count(
                    NetworkSecurityEvent.id
                )
            ).where(
                NetworkSecurityEvent.event_timestamp
                >= start_24h
            )
        )
        or 0
    )

    network_status = (
        get_network_monitoring_status(
            db
        )
    )

    return {
        "pending_original_reviews":
            pending_original_reviews,

        "application_alerts":
            application_alerts,

        "audit_logs_last_24h":
            audit_logs_last_24h,

        "network_events_last_24h":
            network_events_last_24h,

        "network_monitoring_status":
            network_status["status"],

        "last_network_event_at":
            network_status[
                "last_event_at"
            ],
    }


@router.post(
    "/network-events/ingest",
    response_model=(
        NetworkSecurityEventResponse
    ),
    status_code=(
        status.HTTP_201_CREATED
    )
)
def ingest_network_event(
    event_data: NetworkSecurityEventCreate,

    x_network_sensor_key: str | None = Header(
        default=None,
        alias="X-Network-Sensor-Key"
    ),

    db: Session = Depends(get_db)
):
    expected_key = os.getenv(
        "NETWORK_SENSOR_API_KEY"
    )

    if not expected_key:

        raise HTTPException(
            status_code=(
                status.HTTP_503_SERVICE_UNAVAILABLE
            ),
            detail=(
                "Network sensor integration "
                "is not configured"
            )
        )

    if (
        x_network_sensor_key is None
        or not hmac.compare_digest(
            x_network_sensor_key,
            expected_key
        )
    ):

        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid network sensor key"
            )
        )

    sensor_name = (
        event_data.sensor_name.strip()
    )

    event_type = (
        event_data.event_type.strip()
    )

    if not sensor_name:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Sensor name is required"
            )
        )

    if not event_type:

        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Event type is required"
            )
        )

    network_event = NetworkSecurityEvent(
        sensor_name=sensor_name,
        event_type=event_type,
        severity=event_data.severity,
        source_ip=event_data.source_ip,
        destination_ip=(
            event_data.destination_ip
        ),
        source_port=(
            event_data.source_port
        ),
        destination_port=(
            event_data.destination_port
        ),
        protocol=event_data.protocol,
        signature=event_data.signature,
        category=event_data.category,
        details=event_data.details,
        event_timestamp=(
            event_data.event_timestamp
        ),
    )

    db.add(
        network_event
    )

    db.commit()

    db.refresh(
        network_event
    )

    return build_network_event_response(
        network_event
    )