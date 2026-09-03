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
from app.schemas.ai_analysis import AIAnalysisResponse
from app.services.ai_analysis_service import (
    analyze_encrypted_document,
)
from app.services.audit_service import (
    record_audit_event,
)


router = APIRouter(
    prefix="/ai-analysis",
    tags=["AI Analysis"]
)


def get_client_ip(
    request: Request
) -> str | None:

    if request.client is None:
        return None

    return request.client.host


@router.post(
    "/{document_id}",
    response_model=AIAnalysisResponse
)
def analyze_document(
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
                "Unauthorized AI analysis attempt"
            ),
            ip_address=get_client_ip(request),
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only the document owner "
                "can analyze this document"
            )
        )

    analysis = analyze_encrypted_document(
        document
    )

    record_audit_event(
        action="AI_ANALYSIS_COMPLETED",
        user_id=current_user.id,
        resource_type="document",
        resource_id=document.id,
        details=(
            f"AI analysis completed. "
            f"PII detected: "
            f"{analysis['pii_count']}"
        ),
        ip_address=get_client_ip(request),
    )

    return analysis