from datetime import datetime

from pydantic import BaseModel


class AIProcessingReportResponse(BaseModel):
    document_id: int
    filename: str
    file_type: str
    integrity_verified: bool
    text_length: int
    pii_found: bool
    pii_count: int
    pii_counts: dict[str, int]
    anonymized_ready: bool
    processing_time_ms: float
    report_generated_at: datetime