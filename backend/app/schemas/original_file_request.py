from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class OwnerDecisionRequest(BaseModel):
    decision: Literal[
        "APPROVE",
        "REJECT"
    ]


class SecurityDecisionRequest(BaseModel):
    decision: Literal[
        "APPROVE",
        "REJECT"
    ]


class OriginalFileRequestResponse(BaseModel):
    id: int
    document_id: int
    original_filename: str
    requester_id: int
    owner_id: int
    security_officer_id: int | None
    status: str
    requested_at: datetime
    owner_reviewed_at: datetime | None
    security_reviewed_at: datetime | None