from pydantic import BaseModel


class AnonymizationResponse(BaseModel):
    document_id: int
    filename: str
    pii_count: int
    pii_counts: dict[str, int]
    replacement_count: int
    anonymized_ready: bool