"""Persistent status for a document anonymization task.

Only the encrypted replacement mapping, never raw PII, is persisted.
"""
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AnonymizationJob(Base):
    __tablename__ = 'anonymization_jobs'

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    document_id: Mapped[int] = mapped_column(ForeignKey('documents.id'), unique=True, nullable=False, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey('users.id'), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default='QUEUED')
    # Workflow checkpoints, never time-based estimated progress.
    progress_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    progress_stage: Mapped[str] = mapped_column(String(96), nullable=False, default='Queued')
    pii_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    pii_counts: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    replacement_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    encrypted_replacements: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(300), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
