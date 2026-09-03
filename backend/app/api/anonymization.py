from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.document import Document
from app.models.user import User
from app.schemas.anonymization import (
    AnonymizationResponse,
)
from app.services.audit_service import (
    record_audit_event,
)
from app.services.document_anonymizer import (
    anonymize_and_store_document,
)


router = APIRouter(
    prefix="/anonymization",
    tags=["Anonymization"]
)


def get_client_ip(
    request: Request
) -> str | None:

    if request.client is None:
        return None

    return request.client.host


@router.post(
    "/{document_id}",
    response_model=AnonymizationResponse
)
def anonymize_document(
    document_id: int,
    request: Request,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    document = db.get(
        Document,
        document_id
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if document.owner_id != current_user.id:
        record_audit_event(
            action="UNAUTHORIZED_ACCESS",
            user_id=current_user.id,
            resource_type="document",
            resource_id=document.id,
            details=(
                "Unauthorized document "
                "anonymization attempt"
            ),
            ip_address=get_client_ip(request),
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only the document owner "
                "can anonymize this document"
            )
        )

    if document.anonymized_file_path:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Document has already "
                "been anonymized"
            )
        )

    result = anonymize_and_store_document(
        document
    )

    generated_path = Path(
        result["anonymized_file_path"]
    )

    try:
        document.anonymized_file_path = (
            result["anonymized_file_path"]
        )

        db.commit()
        db.refresh(document)

    except Exception:
        db.rollback()

        if generated_path.exists():
            generated_path.unlink()

        raise

    record_audit_event(
        action="DOCUMENT_ANONYMIZED",
        user_id=current_user.id,
        resource_type="document",
        resource_id=document.id,
        details=(
            f"Document anonymized. "
            f"PII detected: "
            f"{result['pii_count']}"
        ),
        ip_address=get_client_ip(request),
    )

    return {
        "document_id":
            document.id,

        "filename":
            document.original_filename,

        "pii_count":
            result["pii_count"],

        "pii_counts":
            result["pii_counts"],

        "replacement_count":
            result["replacement_count"],

        "anonymized_ready":
            True,
    }