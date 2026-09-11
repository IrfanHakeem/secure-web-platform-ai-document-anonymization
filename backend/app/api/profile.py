import re
import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.profile import (
    ProfileResponse,
    ProfileUpdateRequest,
)
from app.services.audit_service import (
    record_audit_event,
)


router = APIRouter(
    prefix="/profile",
    tags=["Profile"]
)


PROFILE_PHOTO_STORAGE = Path(
    "storage/profile_photos"
)

PROFILE_PHOTO_STORAGE.mkdir(
    parents=True,
    exist_ok=True
)


MAX_PROFILE_PHOTO_SIZE = (
    5 * 1024 * 1024
)


ALLOWED_PHOTO_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
}


EMAIL_PATTERN = re.compile(
    r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
)


def get_client_ip(
    request: Request
) -> str | None:

    if request.client is None:
        return None

    return request.client.host


def build_profile_response(
    user: User
) -> dict:

    department_name = None

    if user.department is not None:
        department_name = (
            user.department.name
        )

    has_profile_photo = (
        user.profile_photo_path is not None
        and
        Path(
            user.profile_photo_path
        ).exists()
    )

    profile_photo_url = None

    if has_profile_photo:
        profile_photo_url = (
            "/profile/photo"
        )

    return {
        "id":
            user.id,

        "username":
            user.username,

        "full_name":
            user.full_name,

        "email":
            user.email,

        "role":
            user.role.name,

        "department_id":
            user.department_id,

        "department_name":
            department_name,

        "is_active":
            user.is_active,

        "has_profile_photo":
            has_profile_photo,

        "profile_photo_url":
            profile_photo_url,
    }


def validate_photo_signature(
    data: bytes,
    extension: str
) -> bool:

    if extension in {
        ".jpg",
        ".jpeg",
    }:
        return data.startswith(
            b"\xff\xd8\xff"
        )

    if extension == ".png":
        return data.startswith(
            b"\x89PNG\r\n\x1a\n"
        )

    if extension == ".webp":
        return (
            len(data) >= 12
            and
            data[0:4] == b"RIFF"
            and
            data[8:12] == b"WEBP"
        )

    return False


@router.get(
    "",
    response_model=ProfileResponse
)
def get_profile(
    current_user: User = Depends(
        get_current_user
    )
):
    return build_profile_response(
        current_user
    )


@router.patch(
    "",
    response_model=ProfileResponse
)
def update_profile(
    profile_data: ProfileUpdateRequest,
    request: Request,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    changed = False

    if profile_data.full_name is not None:

        full_name = (
            profile_data.full_name.strip()
        )

        if not full_name:
            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail=(
                    "Full name cannot be empty"
                )
            )

        current_user.full_name = (
            full_name
        )

        changed = True

    if profile_data.email is not None:

        email = (
            profile_data.email
            .strip()
            .lower()
        )

        if not email:
            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail="Email cannot be empty"
            )

        if EMAIL_PATTERN.fullmatch(
            email
        ) is None:
            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail="Invalid email format"
            )

        existing_user = db.scalar(
            select(User).where(
                func.lower(
                    User.email
                ) == email,
                User.id
                != current_user.id,
            )
        )

        if existing_user is not None:
            raise HTTPException(
                status_code=(
                    status.HTTP_409_CONFLICT
                ),
                detail="Email already exists"
            )

        current_user.email = (
            email
        )

        changed = True

    if not changed:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "No profile changes provided"
            )
        )

    db.commit()

    db.refresh(
        current_user
    )

    record_audit_event(
        action="PROFILE_UPDATED",
        user_id=current_user.id,
        resource_type="user",
        resource_id=current_user.id,
        details="User profile updated",
        ip_address=get_client_ip(
            request
        ),
    )

    return build_profile_response(
        current_user
    )


@router.post(
    "/photo",
    response_model=ProfileResponse
)
async def upload_profile_photo(
    request: Request,
    photo: UploadFile = File(...),
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    if not photo.filename:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail="Photo filename is required"
        )

    extension = Path(
        photo.filename
    ).suffix.lower()

    if extension not in (
        ALLOWED_PHOTO_EXTENSIONS
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail=(
                "Only JPG, JPEG, PNG, "
                "and WEBP photos are allowed"
            )
        )

    data = await photo.read()

    if not data:
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail="Photo is empty"
        )

    if len(data) > (
        MAX_PROFILE_PHOTO_SIZE
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
            ),
            detail=(
                "Maximum profile photo "
                "size is 5 MB"
            )
        )

    if not validate_photo_signature(
        data,
        extension
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_400_BAD_REQUEST
            ),
            detail="Invalid image file"
        )

    old_photo_path = (
        current_user.profile_photo_path
    )

    stored_filename = (
        f"{uuid.uuid4().hex}"
        f"{extension}"
    )

    new_photo_path = (
        PROFILE_PHOTO_STORAGE
        / stored_filename
    )

    new_photo_path.write_bytes(
        data
    )

    current_user.profile_photo_path = (
        str(new_photo_path)
    )

    try:
        db.commit()

        db.refresh(
            current_user
        )

    except Exception:
        db.rollback()

        if new_photo_path.exists():
            new_photo_path.unlink()

        raise

    if old_photo_path:

        old_path = Path(
            old_photo_path
        )

        if (
            old_path.exists()
            and
            old_path != new_photo_path
        ):
            old_path.unlink()

    record_audit_event(
        action="PROFILE_PHOTO_UPDATED",
        user_id=current_user.id,
        resource_type="user",
        resource_id=current_user.id,
        details=(
            "Profile photo updated"
        ),
        ip_address=get_client_ip(
            request
        ),
    )

    return build_profile_response(
        current_user
    )


@router.get(
    "/photo"
)
def get_profile_photo(
    current_user: User = Depends(
        get_current_user
    )
):
    if (
        current_user.profile_photo_path
        is None
    ):
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Profile photo not found"
            )
        )

    photo_path = Path(
        current_user.profile_photo_path
    )

    if not photo_path.exists():
        raise HTTPException(
            status_code=(
                status.HTTP_404_NOT_FOUND
            ),
            detail=(
                "Profile photo not found"
            )
        )

    extension = (
        photo_path.suffix.lower()
    )

    media_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }

    return FileResponse(
        path=photo_path,
        media_type=media_types.get(
            extension,
            "application/octet-stream"
        ),
    )