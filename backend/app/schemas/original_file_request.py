from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class OriginalFileRequestCreate(BaseModel):
    reason: str


class OwnerDecisionRequest(BaseModel):
    decision: Literal[
        "APPROVE",
        "REJECT",
    ]


class SecurityDecisionRequest(BaseModel):
    decision: Literal[
        "APPROVE",
        "REJECT",
    ]


class OriginalFileRequestResponse(BaseModel):
    id: int
    document_id: int
    original_filename: str

    requester_id: int
    requester_username: str
    requester_full_name: str | None

    owner_id: int
    owner_username: str
    owner_full_name: str | None

    security_officer_id: int | None
    security_officer_username: str | None

    reason: str | None
    status: str

    requested_at: datetime
    owner_reviewed_at: datetime | None
    security_reviewed_at: datetime | None