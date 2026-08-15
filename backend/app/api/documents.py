from fastapi import (
    APIRouter,
    Depends,
    File,
    UploadFile,
)

from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.document import Document
from app.models.user import User
from app.schemas.document import DocumentUploadResponse
from app.services.file_service import process_uploaded_file


router = APIRouter(
    prefix="/documents",
    tags=["Documents"]
)


@router.post(
    "/upload",
    response_model=DocumentUploadResponse
)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    file_data = await process_uploaded_file(
        file
    )

    document = Document(
        owner_id=current_user.id,
        original_filename=(
            file_data["original_filename"]
        ),
        file_type=file_data["file_type"],
        file_size=file_data["file_size"],
        sha256_hash=file_data["sha256_hash"],
        encrypted_file_path=(
            file_data["encrypted_file_path"]
        ),
        anonymized_file_path=None,
        is_private=True,
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return document