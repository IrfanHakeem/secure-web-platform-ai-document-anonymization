import logging
from pathlib import Path

from app.core.database import SessionLocal
from app.models.audit_log import AuditLog


LOG_DIRECTORY = Path(
    "storage/logs"
)

LOG_DIRECTORY.mkdir(
    parents=True,
    exist_ok=True
)

SECURITY_LOG_FILE = (
    LOG_DIRECTORY / "security.log"
)


audit_logger = logging.getLogger(
    "security_audit"
)

audit_logger.setLevel(
    logging.INFO
)

audit_logger.propagate = False


if not audit_logger.handlers:
    file_handler = logging.FileHandler(
        SECURITY_LOG_FILE,
        encoding="utf-8"
    )

    formatter = logging.Formatter(
        "%(asctime)s | "
        "%(levelname)s | "
        "%(message)s"
    )

    file_handler.setFormatter(
        formatter
    )

    audit_logger.addHandler(
        file_handler
    )


def record_audit_event(
    action: str,
    user_id: int | None = None,
    resource_type: str | None = None,
    resource_id: int | None = None,
    details: str | None = None,
    ip_address: str | None = None,
) -> AuditLog:

    db = SessionLocal()

    try:
        audit_log = AuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details,
            ip_address=ip_address,
        )

        db.add(
            audit_log
        )

        db.commit()
        db.refresh(
            audit_log
        )

        audit_logger.info(
            "action=%s | "
            "user_id=%s | "
            "resource_type=%s | "
            "resource_id=%s | "
            "ip_address=%s | "
            "details=%s",
            action,
            user_id,
            resource_type,
            resource_id,
            ip_address,
            details,
        )

        return audit_log

    except Exception:
        db.rollback()

        audit_logger.exception(
            "Failed to record audit event: %s",
            action
        )

        raise

    finally:
        db.close()
