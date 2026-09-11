from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class NetworkSecurityEventCreate(BaseModel):
    sensor_name: str
    event_type: str

    severity: Literal[
        "LOW",
        "MEDIUM",
        "HIGH",
        "CRITICAL",
    ]

    source_ip: str | None = None
    destination_ip: str | None = None

    source_port: int | None = None
    destination_port: int | None = None

    protocol: str | None = None

    signature: str | None = None
    category: str | None = None
    details: str | None = None

    event_timestamp: datetime


class NetworkSecurityEventResponse(BaseModel):
    id: int

    sensor_name: str
    event_type: str
    severity: str

    source_ip: str | None
    destination_ip: str | None

    source_port: int | None
    destination_port: int | None

    protocol: str | None

    signature: str | None
    category: str | None
    details: str | None

    event_timestamp: datetime
    received_at: datetime


class NetworkMonitoringStatusResponse(BaseModel):
    status: str

    integration_configured: bool

    total_events: int

    last_event_at: datetime | None


class SecurityDashboardSummaryResponse(BaseModel):
    pending_original_reviews: int

    application_alerts: int

    audit_logs_last_24h: int

    network_events_last_24h: int

    network_monitoring_status: str

    last_network_event_at: datetime | None