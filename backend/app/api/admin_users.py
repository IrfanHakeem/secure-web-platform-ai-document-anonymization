import re

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    status,
)
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import require_role
from app.core.security import hash_password
from app.models.department import Department
from app.models.role import Role
from app.models.user import User
from app.schemas.user_management import (
    AdminCreateUserRequest,
    AdminUserResponse,
    PasswordResetRequest,
    UserDepartmentUpdate,
)
from app.services.audit_service import record_audit_event


router = APIRouter(
    prefix="/admin/users",
    tags=["Admin User Management"]
)


EMAIL_PATTERN = re.compile(
    r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
)


def get_client_ip(
    request: Request
) -> str | None:

    if request.client is None:
        return None

    return request.client.host


def build_user_response(
    user: User,
    role_name: str
) -> dict:

    department_name = None

    if user.department is not None:
        department_name = user.department.name

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
            role_name,

        "department_id":
            user.department_id,

        "department_name":
            department_name,

        "is_active":
            user.is_active,
    }


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
        build_user_response(
            user,
            role_name
        )
        for user, role_name in rows
    ]


@router.post(
    "",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED
)
def create_user(
    user_data: AdminCreateUserRequest,
    request: Request,
    current_user: User = Depends(
        require_role("Administrator")
    ),
    db: Session = Depends(get_db)
):
    full_name = (
        user_data.full_name.strip()
    )

    username = (
        user_data.username.strip()
    )

    email = (
        user_data.email.strip().lower()
    )

    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name cannot be empty"
        )

    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username cannot be empty"
        )

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email cannot be empty"
        )

    if EMAIL_PATTERN.fullmatch(
        email
    ) is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email format"
        )

    if not user_data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password cannot be empty"
        )

    if len(
        user_data.password.encode("utf-8")
    ) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is too long for bcrypt"
        )

    existing_username = db.scalar(
        select(User).where(
            func.lower(User.username)
            == username.lower()
        )
    )

    if existing_username is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists"
        )

    existing_email = db.scalar(
        select(User).where(
            func.lower(User.email)
            == email
        )
    )

    if existing_email is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already exists"
        )

    role = db.scalar(
        select(Role).where(
            Role.name == user_data.role
        )
    )

    if role is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role"
        )

    department_id = None

    if user_data.role == "User":

        if user_data.department_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Department is required "
                    "for User accounts"
                )
            )

        department = db.get(
            Department,
            user_data.department_id
        )

        if department is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )

        department_id = (
            department.id
        )

    new_user = User(
        full_name=full_name,
        username=username,
        email=email,
        password_hash=hash_password(
            user_data.password
        ),
        role_id=role.id,
        department_id=department_id,
        is_active=True,
    )

    db.add(
        new_user
    )

    db.commit()

    db.refresh(
        new_user
    )

    record_audit_event(
        action="USER_CREATED",
        user_id=current_user.id,
        resource_type="user",
        resource_id=new_user.id,
        details=(
            f"Created user "
            f"{new_user.username} "
            f"with role {role.name}"
        ),
        ip_address=get_client_ip(
            request
        ),
    )

    return build_user_response(
        new_user,
        role.name
    )


@router.patch(
    "/{user_id}/department",
    response_model=AdminUserResponse
)
def update_user_department(
    user_id: int,
    department_data: UserDepartmentUpdate,
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

    role = db.get(
        Role,
        target_user.role_id
    )

    if (
        role is None
        or role.name != "User"
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Only User accounts can "
                "be assigned to departments"
            )
        )

    department = db.get(
        Department,
        department_data.department_id
    )

    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    target_user.department_id = (
        department.id
    )

    db.commit()

    db.refresh(
        target_user
    )

    record_audit_event(
        action="USER_DEPARTMENT_UPDATED",
        user_id=current_user.id,
        resource_type="user",
        resource_id=target_user.id,
        details=(
            f"Assigned user "
            f"{target_user.username} "
            f"to department "
            f"{department.name}"
        ),
        ip_address=get_client_ip(
            request
        ),
    )

    return build_user_response(
        target_user,
        role.name
    )


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

    target_role = db.get(
        Role,
        target_user.role_id
    )

    if (
        target_role is not None
        and target_role.name
        == "Administrator"
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Administrator password "
                "cannot be reset through "
                "User Management"
            )
        )

    new_password = (
        reset_data.new_password
    )

    if not new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "New password cannot be empty"
            )
        )

    if len(
        new_password.encode("utf-8")
    ) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Password is too long for bcrypt"
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
        ip_address=get_client_ip(
            request
        ),
    )

    return {
        "message":
            "Password reset successfully",

        "user_id":
            target_user.id,

        "username":
            target_user.username,

        "email":
            target_user.email,
    }