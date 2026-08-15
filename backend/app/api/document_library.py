from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import (
    get_current_user,
    require_role,
)
from app.models.department import Department
from app.models.document import Document
from app.models.document_share import DocumentShare
from app.models.user import User
from app.schemas.document_library import (
    AnonymizedDocumentResponse,
    ShareDocumentRequest,
    ShareDocumentResponse,
)
from app.services.audit_service import (
    record_audit_event,
)


router = APIRouter(
    prefix="/document-library",
    tags=["Document Library"]
)


def get_client_ip(
    request: Request
) -> str | None:

    if request.client is None:
        return None

    return request.client.host


@router.get(
    "/my-anonymized",
    response_model=list[
        AnonymizedDocumentResponse
    ]
)
def get_my_anonymized_files(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    documents = db.scalars(
        select(Document)
        .where(
            Document.owner_id
            == current_user.id,

            Document.anonymized_file_path
            .is_not(None),
        )
        .order_by(
            Document.created_at.desc()
        )
    ).all()

    return [
        {
            "id":
                document.id,

            "original_filename":
                document.original_filename,

            "file_type":
                document.file_type,

            "file_size":
                document.file_size,

            "owner_id":
                current_user.id,

            "owner_username":
                current_user.username,

            "is_private":
                document.is_private,

            "created_at":
                document.created_at,
        }
        for document in documents
    ]


@router.get(
    "/shared-with-me",
    response_model=list[
        AnonymizedDocumentResponse
    ]
)
def get_shared_with_me(
    current_user: User = Depends(
        require_role("User")
    ),
    db: Session = Depends(get_db)
):
    if current_user.department_id is None:
        return []

    statement = (
        select(
            Document,
            User.username,
        )
        .join(
            DocumentShare,
            Document.id
            == DocumentShare.document_id
        )
        .join(
            User,
            Document.owner_id
            == User.id
        )
        .where(
            DocumentShare.department_id
            == current_user.department_id,

            Document.anonymized_file_path
            .is_not(None),
        )
        .order_by(
            Document.created_at.desc()
        )
    )

    rows = db.execute(
        statement
    ).all()

    return [
        {
            "id":
                document.id,

            "original_filename":
                document.original_filename,

            "file_type":
                document.file_type,

            "file_size":
                document.file_size,

            "owner_id":
                document.owner_id,

            "owner_username":
                owner_username,

            "is_private":
                document.is_private,

            "created_at":
                document.created_at,
        }
        for document, owner_username in rows
    ]


@router.post(
    "/{document_id}/share",
    response_model=ShareDocumentResponse,
    status_code=status.HTTP_201_CREATED
)
def share_anonymized_document(
    document_id: int,
    share_data: ShareDocumentRequest,
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
                "Unauthorized anonymized "
                "document sharing attempt"
            ),
            ip_address=get_client_ip(request),
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Only the document owner "
                "can share this document"
            )
        )

    if document.anonymized_file_path is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Anonymized file is not "
                "available yet"
            )
        )

    department = db.get(
        Department,
        share_data.department_id
    )

    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    existing_share = db.scalar(
        select(DocumentShare).where(
            DocumentShare.document_id
            == document.id,

            DocumentShare.department_id
            == department.id
        )
    )

    if existing_share is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Document is already shared "
                "with this department"
            )
        )

    document_share = DocumentShare(
        document_id=document.id,
        department_id=department.id
    )

    document.is_private = False

    db.add(document_share)
    db.commit()

    record_audit_event(
        action="ANONYMIZED_DOCUMENT_SHARED",
        user_id=current_user.id,
        resource_type="document",
        resource_id=document.id,
        details=(
            f"Anonymized document shared "
            f"with department "
            f"{department.name}"
        ),
        ip_address=get_client_ip(request),
    )

    return {
        "document_id":
            document.id,

        "department_id":
            department.id,

        "department_name":
            department.name,

        "shared":
            True,
    }


@router.get(
    "/{document_id}/download-anonymized"
)
def download_anonymized_document(
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

    if document.anonymized_file_path is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anonymized file is not available"
        )

    is_owner = (
        document.owner_id
        == current_user.id
    )

    is_shared = False

    if (
        current_user.role.name == "User"
        and current_user.department_id
        is not None
    ):
        shared_record = db.scalar(
            select(DocumentShare).where(
                DocumentShare.document_id
                == document.id,

                DocumentShare.department_id
                == current_user.department_id
            )
        )

        is_shared = (
            shared_record is not None
        )

    if not is_owner and not is_shared:
        record_audit_event(
            action="UNAUTHORIZED_ACCESS",
            user_id=current_user.id,
            resource_type="document",
            resource_id=document.id,
            details=(
                "Unauthorized anonymized "
                "document download attempt"
            ),
            ip_address=get_client_ip(request),
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    file_path = Path(
        document.anonymized_file_path
    )

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=(
                "Anonymized file was not found "
                "in storage"
            )
        )

    record_audit_event(
        action="ANONYMIZED_DOWNLOAD",
        user_id=current_user.id,
        resource_type="document",
        resource_id=document.id,
        details=(
            "Anonymized document downloaded"
        ),
        ip_address=get_client_ip(request),
    )

    return FileResponse(
        path=file_path,
        filename=(
            f"anonymized_"
            f"{document.original_filename}"
        ),
        media_type=(
            "application/octet-stream"
        )
    )