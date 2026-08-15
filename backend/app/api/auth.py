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
from app.core.dependencies import (
    get_current_user,
    require_role,
)
from app.core.security import (
    create_access_token,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
)
from app.services.audit_service import (
    record_audit_event,
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


def get_client_ip(
    request: Request
) -> str | None:

    if request.client is None:
        return None

    return request.client.host


@router.post(
    "/login",
    response_model=TokenResponse
)
def login(
    credentials: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    client_ip = get_client_ip(
        request
    )

    user = db.scalar(
        select(User).where(
            User.username
            == credentials.username
        )
    )

    if user is None:
        record_audit_event(
            action="LOGIN_FAILED",
            user_id=None,
            resource_type="authentication",
            details=(
                "Login failed for username: "
                f"{credentials.username}"
            ),
            ip_address=client_ip,
        )

        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid username or password"
            )
        )

    if not verify_password(
        credentials.password,
        user.password_hash
    ):
        record_audit_event(
            action="LOGIN_FAILED",
            user_id=user.id,
            resource_type="authentication",
            details=(
                "Invalid password attempt"
            ),
            ip_address=client_ip,
        )

        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Invalid username or password"
            )
        )

    if not user.is_active:
        record_audit_event(
            action="LOGIN_FAILED",
            user_id=user.id,
            resource_type="authentication",
            details=(
                "Inactive account "
                "attempted login"
            ),
            ip_address=client_ip,
        )

        raise HTTPException(
            status_code=(
                status.HTTP_403_FORBIDDEN
            ),
            detail=(
                "User account is inactive"
            )
        )

    access_token = create_access_token(
        user.id
    )

    record_audit_event(
        action="LOGIN_SUCCESS",
        user_id=user.id,
        resource_type="authentication",
        details=(
            f"Successful login as "
            f"{user.role.name}"
        ),
        ip_address=client_ip,
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer"
    )


@router.get("/verify")
def verify_authentication(
    current_user: User = Depends(
        get_current_user
    )
):
    return {
        "authenticated": True,
        "username":
            current_user.username,
        "role":
            current_user.role.name
    }


@router.get("/admin-check")
def verify_administrator(
    current_user: User = Depends(
        require_role("Administrator")
    )
):
    return {
        "authorized": True,
        "role":
            current_user.role.name
    }