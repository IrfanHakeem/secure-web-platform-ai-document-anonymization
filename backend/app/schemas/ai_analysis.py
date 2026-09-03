from pydantic import BaseModel


class PIIDetectionResponse(BaseModel):
    type: str
    value: str
    start: int
    end: int
    source: str


class AIAnalysisResponse(BaseModel):
    document_id: int
    filename: str
    file_type: str
    integrity_verified: bool
    text_length: int
    pii_found: bool
    pii_count: int
    pii_counts: dict[str, int]
    detections: list[PIIDetectionResponse]