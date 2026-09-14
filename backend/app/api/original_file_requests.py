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
from app.models.audit_log import AuditLog
from app.models.document import Document
from app.models.original_file_request import (
    OriginalFileRequest,
)
from app.models.user import User
from app.schemas.original_file_request import (
    OriginalFileRequestCreate,
    OriginalFileRequestResponse,
    OwnerDecisionRequest,
    SecurityDecisionRequest,
)
from app.services.audit_service import (
    record_audit_event,
)
from app.services.file_service import (
    inspect_original_integrity,
    retrieve_original_file,
)


router = APIRouter(
    prefix="/original-file-requests",
    tags=["Original File Requests"],
)


ACTIVE_REQUEST_STATUSES = {
    "PENDING_OWNER",
    "PENDING_SECURITY",
}


SECURITY_REVIEW_AUDIT_ACTIONS = {
    "SECURITY_ORIGINAL_REVIEWED",
    "SECURITY_ORIGINAL_REVIEW_FAILED",
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


INLINE_REVIEW_TYPES = {
    "pdf",
    "txt",
    "csv",
}


def get_client_ip(
    request: Request,
) -> str | None:
    if request.client is None:
        return None

    return request.client.host


def build_request_response(
    original_request: OriginalFileRequest,
    document: Document,
    db: Session,
) -> dict:
    requester = db.get(
        User,
        original_request.requester_id,
    )

    owner = db.get(
        User,
        document.owner_id,
    )

    security_officer = None

    if (
        original_request.security_officer_id
        is not None
    ):
        security_officer = db.get(
            User,
            original_request.security_officer_id,
        )

    return {
        "id": original_request.id,
        "document_id": document.id,
        "original_filename": document.original_filename,
        "requester_id": original_request.requester_id,
        "requester_username": (
            requester.username
            if requester
            else "Unknown"
        ),
        "requester_full_name": (
            requester.full_name
            if requester
            else None
        ),
        "owner_id": document.owner_id,
        "owner_username": (
            owner.username
            if owner
            else "Unknown"
        ),
        "owner_full_name": (
            owner.full_name
            if owner
            else None
        ),
        "security_officer_id": (
            original_request.security_officer_id
        ),
        "security_officer_username": (
            security_officer.username
            if security_officer
            else None
        ),
        "reason": original_request.reason,
        "status": original_request.status,
        "requested_at": original_request.requested_at,
        "owner_reviewed_at": original_request.owner_reviewed_at,
        "security_reviewed_at": (
            original_request.security_reviewed_at
        ),
    }


def get_pending_security_request(
    request_id: int,
    db: Session,
) -> tuple[OriginalFileRequest, Document]:
    original_request = db.get(
        OriginalFileRequest,
        request_id,
    )

    if original_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original file request not found",
        )

    document = db.get(
        Document,
        original_request.document_id,
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
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
            ),
        )

    return original_request, document


def get_latest_security_review_audit(
    request_id: int,
    security_officer_id: int,
    db: Session,
) -> AuditLog | None:
    return db.scalar(
        select(AuditLog)
        .where(
            AuditLog.user_id
            == security_officer_id,
            AuditLog.resource_type
            == "original_file_request",
            AuditLog.resource_id
            == request_id,
            AuditLog.action.in_(
                SECURITY_REVIEW_AUDIT_ACTIONS,
            ),
        )
        .order_by(
            AuditLog.created_at.desc(),
            AuditLog.id.desc(),
        )
    )


@router.get(
    "/my-requests",
    response_model=list[
        OriginalFileRequestResponse
    ],
)
def get_my_original_requests(
    current_user: User = Depends(
        require_role("User")
    ),
    db: Session = Depends(get_db),
):
    statement = (
        select(
            OriginalFileRequest,
            Document,
        )
        .join(
            Document,
            OriginalFileRequest.document_id
            == Document.id,
        )
        .where(
            OriginalFileRequest.requester_id
            == current_user.id,
        )
        .order_by(
            OriginalFileRequest.requested_at.desc(),
        )
    )

    rows = db.execute(
        statement
    ).all()

    return [
        build_request_response(
            original_request,
            document,
            db,
        )
        for original_request, document
        in rows
    ]


@router.get(
    "/owner/pending",
    response_model=list[
        OriginalFileRequestResponse
    ],
)
def get_owner_pending_requests(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    statement = (
        select(
            OriginalFileRequest,
            Document,
        )
        .join(
            Document,
            OriginalFileRequest.document_id
            == Document.id,
        )
        .where(
            Document.owner_id
            == current_user.id,
            OriginalFileRequest.status
            == "PENDING_OWNER",
        )
        .order_by(
            OriginalFileRequest.requested_at,
        )
    )

    rows = db.execute(
        statement
    ).all()

    return [
        build_request_response(
            original_request,
            document,
            db,
        )
        for original_request, document
        in rows
    ]


@router.get(
    "/security/pending",
    response_model=list[
        OriginalFileRequestResponse
    ],
)
def get_security_pending_requests(
    current_user: User = Depends(
        require_role("Security Officer")
    ),
    db: Session = Depends(get_db),
):
    statement = (
        select(
            OriginalFileRequest,
            Document,
        )
        .join(
            Document,
            OriginalFileRequest.document_id
            == Document.id,
        )
        .where(
            OriginalFileRequest.status
            == "PENDING_SECURITY",
        )
        .order_by(
            OriginalFileRequest.requested_at,
        )
    )

    rows = db.execute(
        statement
    ).all()

    return [
        build_request_response(
            original_request,
            document,
            db,
        )
        for original_request, document
        in rows
    ]


@router.get(
    "/security/reviews",
    response_model=list[
        OriginalFileRequestResponse
    ],
)
def get_security_review_history(
    current_user: User = Depends(
        require_role("Security Officer")
    ),
    db: Session = Depends(get_db),
):
    """
    Return every request that reached the Security Officer stage.

    This includes:
    - PENDING_SECURITY
    - APPROVED
    - REJECTED_BY_SECURITY

    Requests rejected by the document owner are intentionally excluded
    because they never reached Security Officer review.
    """
    statement = (
        select(
            OriginalFileRequest,
            Document,
        )
        .join(
            Document,
            OriginalFileRequest.document_id
            == Document.id,
        )
        .where(
            OriginalFileRequest.status.in_(
                {
                    "PENDING_SECURITY",
                    "APPROVED",
                    "REJECTED_BY_SECURITY",
                }
            ),
        )
        .order_by(
            OriginalFileRequest.requested_at.desc(),
        )
    )

    rows = db.execute(
        statement
    ).all()

    return [
        build_request_response(
            original_request,
            document,
            db,
        )
        for original_request, document
        in rows
    ]


@router.get(
    "/{request_id}/security-review-status",
)
def get_security_review_status(
    request_id: int,
    current_user: User = Depends(
        require_role("Security Officer")
    ),
    db: Session = Depends(get_db),
):
    original_request, document = (
        get_pending_security_request(
            request_id=request_id,
            db=db,
        )
    )

    integrity = inspect_original_integrity(
        encrypted_file_path=(
            document.encrypted_file_path
        ),
        expected_sha256=(
            document.sha256_hash
        ),
    )

    review_audit = (
        get_latest_security_review_audit(
            request_id=original_request.id,
            security_officer_id=(
                current_user.id
            ),
            db=db,
        )
    )

    if review_audit is None:
        review_state = "NOT_REVIEWED"
    elif (
        review_audit.action
        == "SECURITY_ORIGINAL_REVIEWED"
    ):
        review_state = "REVIEWED"
    else:
        review_state = "FAILED"

    return {
        "request_id": original_request.id,
        "document_id": document.id,
        "original_filename": (
            document.original_filename
        ),
        "file_type": document.file_type,
        "original_sha256": (
            integrity["original_sha256"]
        ),
        "current_sha256": (
            integrity["current_sha256"]
        ),
        "integrity_status": (
            integrity["integrity_status"]
        ),
        "review_attempted": (
            review_audit is not None
        ),
        "reviewed": (
            review_state == "REVIEWED"
        ),
        "review_state": review_state,
        "reviewed_at": (
            review_audit.created_at
            if review_audit
            else None
        ),
    }


@router.get(
    "/{request_id}/security-review-original",
)
def review_original_file_as_security_officer(
    request_id: int,
    request: Request,
    current_user: User = Depends(
        require_role("Security Officer")
    ),
    db: Session = Depends(get_db),
):
    original_request, document = (
        get_pending_security_request(
            request_id=request_id,
            db=db,
        )
    )

    try:
        original_data = retrieve_original_file(
            encrypted_file_path=(
                document.encrypted_file_path
            ),
            expected_sha256=(
                document.sha256_hash
            ),
        )

    except HTTPException as review_error:
        if review_error.status_code in {
            status.HTTP_404_NOT_FOUND,
            status.HTTP_409_CONFLICT,
        }:
            record_audit_event(
                action=(
                    "SECURITY_ORIGINAL_REVIEW_FAILED"
                ),
                user_id=current_user.id,
                resource_type=(
                    "original_file_request"
                ),
                resource_id=(
                    original_request.id
                ),
                details=(
                    "Security Officer original-file "
                    "review failed integrity or "
                    "storage verification"
                ),
                ip_address=(
                    get_client_ip(request)
                ),
            )

        raise

    record_audit_event(
        action="SECURITY_ORIGINAL_REVIEWED",
        user_id=current_user.id,
        resource_type="original_file_request",
        resource_id=original_request.id,
        details=(
            "Security Officer reviewed the "
            "decrypted original file after "
            "successful SHA-256 verification"
        ),
        ip_address=get_client_ip(request),
    )

    media_type = MEDIA_TYPES.get(
        document.file_type,
        "application/octet-stream",
    )

    encoded_filename = quote(
        document.original_filename
    )

    disposition = (
        "inline"
        if document.file_type
        in INLINE_REVIEW_TYPES
        else "attachment"
    )

    return Response(
        content=original_data,
        media_type=media_type,
        headers={
            "Content-Disposition": (
                f"{disposition}; "
                f"filename*=UTF-8''{encoded_filename}"
            ),
            "Cache-Control": "no-store",
            "Pragma": "no-cache",
        },
    )


@router.patch(
    "/{request_id}/owner-decision",
    response_model=OriginalFileRequestResponse,
)
def owner_decision(
    request_id: int,
    decision: OwnerDecisionRequest,
    request: Request,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    original_request = db.get(
        OriginalFileRequest,
        request_id,
    )

    if original_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original file request not found",
        )

    document = db.get(
        Document,
        original_request.document_id,
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
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
                "Only the document owner can "
                "review this request"
            ),
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
            ),
        )

    if decision.decision == "APPROVE":
        original_request.status = (
            "PENDING_SECURITY"
        )
        audit_action = "OWNER_APPROVED"
    else:
        original_request.status = (
            "REJECTED_BY_OWNER"
        )
        audit_action = "OWNER_REJECTED"

    original_request.owner_reviewed_at = (
        datetime.now(timezone.utc)
    )

    db.commit()
    db.refresh(original_request)

    record_audit_event(
        action=audit_action,
        user_id=current_user.id,
        resource_type="original_file_request",
        resource_id=original_request.id,
        details=(
            f"Owner decision: {decision.decision}"
        ),
        ip_address=get_client_ip(request),
    )

    return build_request_response(
        original_request,
        document,
        db,
    )


@router.patch(
    "/{request_id}/security-decision",
    response_model=OriginalFileRequestResponse,
)
def security_decision(
    request_id: int,
    decision: SecurityDecisionRequest,
    request: Request,
    current_user: User = Depends(
        require_role("Security Officer")
    ),
    db: Session = Depends(get_db),
):
    original_request, document = (
        get_pending_security_request(
            request_id=request_id,
            db=db,
        )
    )

    review_audit = (
        get_latest_security_review_audit(
            request_id=original_request.id,
            security_officer_id=(
                current_user.id
            ),
            db=db,
        )
    )

    if review_audit is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Review the original file before "
                "making a security decision"
            ),
        )

    if decision.decision == "APPROVE":
        if (
            review_audit.action
            != "SECURITY_ORIGINAL_REVIEWED"
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "Original file integrity review "
                    "did not pass. Approval is blocked"
                ),
            )

        integrity = inspect_original_integrity(
            encrypted_file_path=(
                document.encrypted_file_path
            ),
            expected_sha256=(
                document.sha256_hash
            ),
        )

        if (
            integrity["integrity_status"]
            != "VERIFIED"
        ):
            record_audit_event(
                action=(
                    "SECURITY_APPROVAL_BLOCKED_INTEGRITY"
                ),
                user_id=current_user.id,
                resource_type=(
                    "original_file_request"
                ),
                resource_id=(
                    original_request.id
                ),
                details=(
                    "Security approval blocked because "
                    "the current original-file SHA-256 "
                    "verification failed"
                ),
                ip_address=(
                    get_client_ip(request)
                ),
            )

            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail=(
                    "Original file integrity verification "
                    "failed. Approval is blocked"
                ),
            )

    original_request.security_officer_id = (
        current_user.id
    )

    original_request.security_reviewed_at = (
        datetime.now(timezone.utc)
    )

    if decision.decision == "APPROVE":
        original_request.status = "APPROVED"
        audit_action = "SECURITY_APPROVED"
    else:
        original_request.status = (
            "REJECTED_BY_SECURITY"
        )
        audit_action = "SECURITY_REJECTED"

    db.commit()
    db.refresh(original_request)

    record_audit_event(
        action=audit_action,
        user_id=current_user.id,
        resource_type="original_file_request",
        resource_id=original_request.id,
        details=(
            "Security Officer decision: "
            f"{decision.decision}"
        ),
        ip_address=get_client_ip(request),
    )

    return build_request_response(
        original_request,
        document,
        db,
    )


@router.get(
    "/{request_id}/download-original",
)
def download_approved_original(
    request_id: int,
    request: Request,
    current_user: User = Depends(
        require_role("User")
    ),
    db: Session = Depends(get_db),
):
    original_request = db.get(
        OriginalFileRequest,
        request_id,
    )

    if original_request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original file request not found",
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
            ),
        )

    if original_request.status != "APPROVED":
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
                "Original file request has not "
                "been fully approved"
            ),
        )

    document = db.get(
        Document,
        original_request.document_id,
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    original_data = retrieve_original_file(
        encrypted_file_path=(
            document.encrypted_file_path
        ),
        expected_sha256=(
            document.sha256_hash
        ),
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
        "application/octet-stream",
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
        },
    )


@router.post(
    "/{document_id}",
    response_model=OriginalFileRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def request_original_file(
    document_id: int,
    request_data: OriginalFileRequestCreate,
    request: Request,
    current_user: User = Depends(
        require_role("User")
    ),
    db: Session = Depends(get_db),
):
    reason = request_data.reason.strip()

    if not reason:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Reason for original file access "
                "is required"
            ),
        )

    if len(reason) > 500:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Reason cannot exceed 500 characters"
            ),
        )

    document = db.get(
        Document,
        document_id,
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    if document.is_archived:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "This document has been removed "
                "from the active library and no "
                "longer accepts new original "
                "access requests"
            ),
        )

    if document.owner_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Document owner cannot request "
                "their own original file"
            ),
        )

    existing_request = db.scalar(
        select(OriginalFileRequest).where(
            OriginalFileRequest.document_id
            == document.id,
            OriginalFileRequest.requester_id
            == current_user.id,
            OriginalFileRequest.status.in_(
                ACTIVE_REQUEST_STATUSES,
            ),
        )
    )

    if existing_request is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "An active original file request "
                "already exists"
            ),
        )

    original_request = OriginalFileRequest(
        document_id=document.id,
        requester_id=current_user.id,
        security_officer_id=None,
        reason=reason,
        status="PENDING_OWNER",
    )

    db.add(original_request)
    db.commit()
    db.refresh(original_request)

    record_audit_event(
        action="ORIGINAL_REQUEST_CREATED",
        user_id=current_user.id,
        resource_type="original_file_request",
        resource_id=original_request.id,
        details=(
            "Original document access requested "
            f"for document ID {document.id}"
        ),
        ip_address=get_client_ip(request),
    )

    return build_request_response(
        original_request,
        document,
        db,
    )
