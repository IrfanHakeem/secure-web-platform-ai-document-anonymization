from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.security import hash_password
from app.models.role import Role
from app.models.user import User
from app.schemas.user_management import (
    AdminUserResponse,
    PasswordResetRequest,
)
from app.services.audit_service import (
    record_audit_event,
)


router = APIRouter(
    prefix="/admin/users",
    tags=["Admin User Management"]
)


def get_client_ip(
    request: Request
) -> str | None:

    if request.client is None:
        return None

    return request.client.host


@router.get(
    "",
    response_model=list[AdminUserResponse]
)
def list_users(
    current_user: User = Depends(
        require_role("Administrator")
    ),
    db: Session = Depends(get_db)
):
    statement = (
        select(
            User,
            Role.name
        )
        .join(
            Role,
            User.role_id == Role.id
        )
        .order_by(
            User.id
        )
    )

    rows = db.execute(
        statement
    ).all()

    return [
        {
            "id": user.id,
            "username": user.username,
            "role": role_name,
            "department_id":
                user.department_id,
            "is_active":
                user.is_active,
        }
        for user, role_name in rows
    ]


@router.patch(
    "/{user_id}/reset-password"
)
def reset_user_password(
    user_id: int,
    reset_data: PasswordResetRequest,
    request: Request,
    current_user: User = Depends(
        require_role("Administrator")
    ),
    db: Session = Depends(get_db)
):
    target_user = db.get(
        User,
        user_id
    )

    if target_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    new_password = (
        reset_data.new_password
    )

    if not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be empty"
        )

    if (
        len(new_password.encode("utf-8"))
        > 72
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Password is too long "
                "for bcrypt"
            )
        )

    target_user.password_hash = (
        hash_password(
            new_password
        )
    )

    db.commit()

    record_audit_event(
        action="PASSWORD_RESET_BY_ADMIN",
        user_id=current_user.id,
        resource_type="user",
        resource_id=target_user.id,
        details=(
            f"Password reset for username: "
            f"{target_user.username}"
        ),
        ip_address=get_client_ip(request),
    )

    return {
        "message":
            "Password reset successfully",

        "user_id":
            target_user.id,

        "username":
            target_user.username,
    }