from datetime import datetime

from pydantic import BaseModel


class ApprovedOriginalAccessResponse(BaseModel):
    request_id: int
    document_id: int
    original_filename: str
    owner_id: int
    owner_username: str
    security_officer_id: int
    owner_reviewed_at: datetime
    security_reviewed_at: datetime