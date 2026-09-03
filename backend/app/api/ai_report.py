from datetime import datetime, timezone
from time import perf_counter

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
from app.schemas.ai_report import (
    AIProcessingReportResponse,
)
from app.services.ai_analysis_service import (
    analyze_encrypted_document,
)
from app.services.audit_service import (
    record_audit_event,
)


router = APIRouter(
    prefix="/ai-report",
    tags=["AI Processing Report"]
)


def get_client_ip(
    request: Request
) -> str | None:

    if request.client is None:
        return None

    return request.client.host


@router.get(
    "/{document_id}",
    response_model=AIProcessingReportResponse
)
def generate_ai_report(
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
                "Unauthorized AI report access attempt"
            ),
            ip_address=get_client_ip(request),
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only the document owner "
                "can generate this report"
            )
        )

    start_time = perf_counter()

    analysis = analyze_encrypted_document(
        document
    )

    processing_time_ms = (
        perf_counter() - start_time
    ) * 1000

    generated_at = datetime.now(
        timezone.utc
    )

    record_audit_event(
        action="AI_REPORT_GENERATED",
        user_id=current_user.id,
        resource_type="document",
        resource_id=document.id,
        details=(
            f"AI processing report generated. "
            f"PII detected: "
            f"{analysis['pii_count']}"
        ),
        ip_address=get_client_ip(request),
    )

    return {
        "document_id":
            document.id,

        "filename":
            document.original_filename,

        "file_type":
            document.file_type,

        "integrity_verified":
            analysis["integrity_verified"],

        "text_length":
            analysis["text_length"],

        "pii_found":
            analysis["pii_found"],

        "pii_count":
            analysis["pii_count"],

        "pii_counts":
            analysis["pii_counts"],

        "anonymized_ready":
            document.anonymized_file_path
            is not None,

        "processing_time_ms":
            round(
                processing_time_ms,
                2
            ),

        "report_generated_at":
            generated_at,
    }