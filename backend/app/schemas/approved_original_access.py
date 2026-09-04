from datetime import datetime

from pydantic import BaseModel


class ApprovedOriginalAccessResponse(BaseModel):
    request_id: int
    document_id: int
    original_filename: str

    owner_id: int
    owner_username: str

    security_officer_id: int | None
    security_officer_username: str | None

    owner_reviewed_at: datetime | None
    security_reviewed_at: datetime | None

    original_sha256: str
    current_sha256: str | None
    integrity_status: str