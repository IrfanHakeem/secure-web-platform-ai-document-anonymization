from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import (
    Mapped,
    mapped_column,
)

from app.core.database import Base


class NetworkSecurityEvent(Base):
    __tablename__ = "network_security_events"

    id: Mapped[int] = mapped_column(
        primary_key=True
    )

    sensor_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    event_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    severity: Mapped[str] = mapped_column(
        String(20),
        nullable=False
    )

    source_ip: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True
    )

    destination_ip: Mapped[str | None] = mapped_column(
        String(45),
        nullable=True
    )

    source_port: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    destination_port: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    protocol: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True
    )

    signature: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    category: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    details: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    event_timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(
            timezone.utc
        ),
        nullable=False
    )