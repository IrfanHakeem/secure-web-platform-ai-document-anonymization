from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.models.document import Document
from app.models.original_file_request import (
    OriginalFileRequest,
)
from app.models.user import User
from app.schemas.approved_original_access import (
    ApprovedOriginalAccessResponse,
)


router = APIRouter(
    prefix="/approved-original-access",
    tags=["Approved Original Access"]
)


@router.get(
    "",
    response_model=list[
        ApprovedOriginalAccessResponse
    ]
)
def get_approved_original_access(
    current_user: User = Depends(
        require_role("User")
    ),
    db: Session = Depends(get_db)
):
    owner = User

    statement = (
        select(
            OriginalFileRequest,
            Document,
            owner.username,
        )
        .join(
            Document,
            OriginalFileRequest.document_id
            == Document.id
        )
        .join(
            owner,
            Document.owner_id
            == owner.id
        )
        .where(
            OriginalFileRequest.requester_id
            == current_user.id,

            OriginalFileRequest.status
            == "APPROVED",
        )
        .order_by(
            OriginalFileRequest.security_reviewed_at
            .desc()
        )
    )

    rows = db.execute(
        statement
    ).all()

    return [
        {
            "request_id":
                original_request.id,

            "document_id":
                document.id,

            "original_filename":
                document.original_filename,

            "owner_id":
                document.owner_id,

            "owner_username":
                owner_username,

            "security_officer_id":
                original_request.security_officer_id,

            "owner_reviewed_at":
                original_request.owner_reviewed_at,

            "security_reviewed_at":
                original_request.security_reviewed_at,
        }
        for (
            original_request,
            document,
            owner_username
        ) in rows
    ]