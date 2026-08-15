from datetime import datetime, timezone
from urllib.parse import quote

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    get_current_user,
    require_role,
)
from app.models.document import Document
from app.models.original_file_request import (
    OriginalFileRequest,
)
from app.models.user import User
from app.schemas.original_file_request import (
    OriginalFileRequestResponse,
    OwnerDecisionRequest,
    SecurityDecisionRequest,
)
from app.services.audit_service import (
    record_audit_event,
)
from app.services.file_service import (
    retrieve_original_file,
)


router = APIRouter(
    prefix="/original-file-requests",
    tags=["Original File Requests"]
)


ACTIVE_REQUEST_STATUSES = {
    "PENDING_OWNER",
    "PENDING_SECURITY",
}


MEDIA_TYPES = {
    "pdf": "application/pdf",

    "docx": (
        "application/vnd.openxmlformats-officedocument."
        "wordprocessingml.document"
    ),

    "txt": "text/plain",

    "xlsx": (
        "application/vnd.openxmlformats-officedocument."
        "spreadsheetml.sheet"
    ),

    "csv": "text/csv",
}


def get_client_ip(
    request: Request
) -> str | None:

    if request.client is None:
        return None

    return request.client.host


def build_request_response(
    original_request: OriginalFileRequest,
    document: Document
) -> dict:

    return {
        "id":
            original_request.id,

        "document_id":
            document.id,

        "original_filename":
            document.original_filename,

        "requester_id":
            original_request.requester_id,

        "owner_id":
            document.owner_id,

        "security_officer_id":
            original_request.security_officer_id,

        "status":
            original_request.status,

        "requested_at":
            original_request.requested_at,

        "owner_reviewed_at":
            original_request.owner_reviewed_at,

        "security_reviewed_at":
            original_request.security_reviewed_at,
    }


@router.get(
    "/owner/pending",
    response_model=list[
        OriginalFileRequestResponse
    ]
)
def get_owner_pending_requests(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    statement = (
        select(
            OriginalFileRequest,
            Document,
        )
        .join(
            Document,
            OriginalFileRequest.document_id
            == Document.id
        )
        .where(
            Document.owner_id
            == current_user.id,

            OriginalFileRequest.status
            == "PENDING_OWNER",
        )
        .order_by(
            OriginalFileRequest.requested_at
        )
    )

    rows = db.execute(
        statement
    ).all()

    return [
        build_request_response(
            original_request,
            document
        )
        for original_request, document
        in rows
    ]


@router.get(
    "/security/pending",
    response_model=list[
        OriginalFileRequestResponse
    ]
)
def get_security_pending_requests(
    current_user: User = Depends(
        require_role("Security Officer")
    ),
    db: Session = Depends(get_db)
):
    statement = (
        select(
            OriginalFileRequest,
            Document,
        )
        .join(
            Document,
            OriginalFileRequest.document_id
            == Document.id
        )
        .where(
            OriginalFileRequest.status
            == "PENDING_SECURITY"
        )
        .order_by(
            OriginalFileRequest.requested_at
        )
    )

    rows = db.execute(
        statement
    ).all()

    return [
        build_request_response(
            original_request,
            document
        )
        for original_request, document
        in rows
    ]


@router.patch(
    "/{request_id}/owner-decision",
    response_model=OriginalFileRequestResponse
)
def owner_decision(
    request_id: int,
    decision: OwnerDecisionRequest,
    request: Request,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    original_request = db.get(
        OriginalFileRequest,
        request_id
    )

    if original_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Original file request not found"
            )
        )

    document = db.get(
        Document,
        original_request.document_id
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
            resource_type="original_file_request",
            resource_id=original_request.id,
            details=(
                "Unauthorized owner decision attempt"
            ),
            ip_address=get_client_ip(request),
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only the document owner "
                "can review this request"
            )
        )

    if (
        original_request.status
        != "PENDING_OWNER"
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This request is no longer "
                "pending owner review"
            )
        )

    if decision.decision == "APPROVE":
        original_request.status = (
            "PENDING_SECURITY"
        )

        audit_action = (
            "OWNER_APPROVED"
        )

    else:
        original_request.status = (
            "REJECTED_BY_OWNER"
        )

        audit_action = (
            "OWNER_REJECTED"
        )

    original_request.owner_reviewed_at = (
        datetime.now(timezone.utc)
    )

    db.commit()
    db.refresh(
        original_request
    )

    record_audit_event(
        action=audit_action,
        user_id=current_user.id,
        resource_type="original_file_request",
        resource_id=original_request.id,
        details=(
            f"Owner decision: "
            f"{decision.decision}"
        ),
        ip_address=get_client_ip(request),
    )

    return build_request_response(
        original_request,
        document
    )


@router.patch(
    "/{request_id}/security-decision",
    response_model=OriginalFileRequestResponse
)
def security_decision(
    request_id: int,
    decision: SecurityDecisionRequest,
    request: Request,
    current_user: User = Depends(
        require_role("Security Officer")
    ),
    db: Session = Depends(get_db)
):
    original_request = db.get(
        OriginalFileRequest,
        request_id
    )

    if original_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Original file request not found"
            )
        )

    document = db.get(
        Document,
        original_request.document_id
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    if (
        original_request.status
        != "PENDING_SECURITY"
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This request is not pending "
                "Security Officer review"
            )
        )

    original_request.security_officer_id = (
        current_user.id
    )

    original_request.security_reviewed_at = (
        datetime.now(timezone.utc)
    )

    if decision.decision == "APPROVE":
        original_request.status = (
            "APPROVED"
        )

        audit_action = (
            "SECURITY_APPROVED"
        )

    else:
        original_request.status = (
            "REJECTED_BY_SECURITY"
        )

        audit_action = (
            "SECURITY_REJECTED"
        )

    db.commit()
    db.refresh(
        original_request
    )

    record_audit_event(
        action=audit_action,
        user_id=current_user.id,
        resource_type="original_file_request",
        resource_id=original_request.id,
        details=(
            f"Security Officer decision: "
            f"{decision.decision}"
        ),
        ip_address=get_client_ip(request),
    )

    return build_request_response(
        original_request,
        document
    )


@router.get(
    "/{request_id}/download-original"
)
def download_approved_original(
    request_id: int,
    request: Request,
    current_user: User = Depends(
        require_role("User")
    ),
    db: Session = Depends(get_db)
):
    original_request = db.get(
        OriginalFileRequest,
        request_id
    )

    if original_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Original file request not found"
            )
        )

    if (
        original_request.requester_id
        != current_user.id
    ):
        record_audit_event(
            action="UNAUTHORIZED_ACCESS",
            user_id=current_user.id,
            resource_type="original_file_request",
            resource_id=original_request.id,
            details=(
                "Attempted to download another "
                "user's approved original file"
            ),
            ip_address=get_client_ip(request),
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "You are not the requester "
                "of this original file"
            )
        )

    if (
        original_request.status
        != "APPROVED"
    ):
        record_audit_event(
            action="UNAUTHORIZED_ACCESS",
            user_id=current_user.id,
            resource_type="original_file_request",
            resource_id=original_request.id,
            details=(
                "Original file download attempted "
                "before full approval"
            ),
            ip_address=get_client_ip(request),
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Original file request "
                "has not been fully approved"
            )
        )

    document = db.get(
        Document,
        original_request.document_id
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    original_data = retrieve_original_file(
        encrypted_file_path=(
            document.encrypted_file_path
        ),
        expected_sha256=(
            document.sha256_hash
        )
    )

    record_audit_event(
        action="ORIGINAL_DOWNLOAD",
        user_id=current_user.id,
        resource_type="document",
        resource_id=document.id,
        details=(
            "Approved original document downloaded"
        ),
        ip_address=get_client_ip(request),
    )

    media_type = MEDIA_TYPES.get(
        document.file_type,
        "application/octet-stream"
    )

    encoded_filename = quote(
        document.original_filename
    )

    return Response(
        content=original_data,
        media_type=media_type,
        headers={
            "Content-Disposition": (
                "attachment; "
                f"filename*=UTF-8''{encoded_filename}"
            ),
            "Cache-Control": "no-store",
        }
    )


@router.post(
    "/{document_id}",
    response_model=OriginalFileRequestResponse,
    status_code=status.HTTP_201_CREATED
)
def request_original_file(
    document_id: int,
    request: Request,
    current_user: User = Depends(
        require_role("User")
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

    if (
        document.owner_id
        == current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Document owner cannot request "
                "their own original file"
            )
        )

    existing_request = db.scalar(
        select(
            OriginalFileRequest
        ).where(
            OriginalFileRequest.document_id
            == document.id,

            OriginalFileRequest.requester_id
            == current_user.id,

            OriginalFileRequest.status.in_(
                ACTIVE_REQUEST_STATUSES
            )
        )
    )

    if existing_request is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "An active original file request "
                "already exists"
            )
        )

    original_request = OriginalFileRequest(
        document_id=document.id,
        requester_id=current_user.id,
        security_officer_id=None,
        status="PENDING_OWNER",
    )

    db.add(
        original_request
    )

    db.commit()
    db.refresh(
        original_request
    )

    record_audit_event(
        action="ORIGINAL_REQUEST_CREATED",
        user_id=current_user.id,
        resource_type="original_file_request",
        resource_id=original_request.id,
        details=(
            f"Original document access requested "
            f"for document ID {document.id}"
        ),
        ip_address=get_client_ip(request),
    )

    return build_request_response(
        original_request,
        document
    )