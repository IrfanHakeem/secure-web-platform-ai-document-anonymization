from pydantic import BaseModel


class AnonymizationReplacementResponse(
    BaseModel
):
    type: str
    original: str
    replacement: str


class AnonymizationResponse(BaseModel):
    document_id: int
    filename: str
    pii_count: int
    pii_counts: dict[str, int]
    replacement_count: int
    replacements: list[
        AnonymizationReplacementResponse
    ]
    anonymized_ready: bool