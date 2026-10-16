"""API schemas omit encrypted report bytes and sensitive originals by default."""
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict


class StartAnonymizationJob(BaseModel):
    document_id: int


class JobStatusResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    job_id: str
    document_id: int
    filename: str
    file_size: int
    status: Literal['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCEL_REQUESTED', 'CANCELLED']
    progress_percent: int
    progress_stage: str
    pii_count: int
    pii_counts: dict[str, int]
    replacement_count: int
    anonymized_ready: bool
    error: str | None
    created_at: datetime
    started_at: datetime | None
    finished_at: datetime | None


class ReplacementResponse(BaseModel):
    type: str
    original: str
    replacement: str


class ReplacementReportResponse(BaseModel):
    job_id: str
    replacements: list[ReplacementResponse]
