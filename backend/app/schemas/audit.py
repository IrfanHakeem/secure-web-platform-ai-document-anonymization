from datetime import datetime

from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int
    user_id: int | None
    username: str | None
    action: str
    resource_type: str | None
    resource_id: int | None
    details: str | None
    ip_address: str | None
    created_at: datetime


class SecurityAlertResponse(BaseModel):
    alert_type: str
    severity: str
    ip_address: str | None
    event_count: int
    message: str
    first_detected_at: datetime
    last_detected_at: datetime