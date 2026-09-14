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
from app.models.department import Department
from app.models.document_share import DocumentShare
from app.models.user import User
from app.schemas.department import (
    DepartmentCreate,
    DepartmentResponse,
)
from app.services.audit_service import record_audit_event


router = APIRouter(
    prefix="/admin/departments",
    tags=["Admin Department Management"],
)


def get_client_ip(
    request: Request
) -> str | None:
    if request.client is None:
        return None

    return request.client.host


@router.get(
    "",
    response_model=list[DepartmentResponse],
)
def list_departments(
    current_user: User = Depends(
        require_role("Administrator")
    ),
    db: Session = Depends(get_db),
):
    departments = db.scalars(
        select(Department).order_by(
            Department.id
        )
    ).all()

    return departments


@router.post(
    "",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_department(
    department_data: DepartmentCreate,
    request: Request,
    current_user: User = Depends(
        require_role("Administrator")
    ),
    db: Session = Depends(get_db),
):
    department_name = (
        department_data.name.strip()
    )

    if not department_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department name cannot be empty",
        )

    existing_department = db.scalar(
        select(Department).where(
            Department.name
            == department_name
        )
    )

    if existing_department is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department already exists",
        )

    department = Department(
        name=department_name
    )

    db.add(department)
    db.commit()
    db.refresh(department)

    record_audit_event(
        action="DEPARTMENT_CREATED",
        user_id=current_user.id,
        resource_type="department",
        resource_id=department.id,
        details=(
            f"Department created: "
            f"{department.name}"
        ),
        ip_address=get_client_ip(request),
    )

    return department


@router.delete(
    "/{department_id}",
    status_code=status.HTTP_200_OK,
)
def delete_department(
    department_id: int,
    request: Request,
    current_user: User = Depends(
        require_role("Administrator")
    ),
    db: Session = Depends(get_db),
):
    department = db.get(
        Department,
        department_id,
    )

    if department is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found",
        )

    assigned_user_count = (
        db.scalar(
            select(func.count())
            .select_from(User)
            .where(
                User.department_id
                == department.id
            )
        )
        or 0
    )

    share_count = (
        db.scalar(
            select(func.count())
            .select_from(DocumentShare)
            .where(
                DocumentShare.department_id
                == department.id
            )
        )
        or 0
    )

    blockers = []

    if assigned_user_count:
        blockers.append(
            f"{assigned_user_count} assigned "
            f"user(s)"
        )

    if share_count:
        blockers.append(
            f"{share_count} active document "
            f"share(s)"
        )

    if blockers:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Department cannot be deleted "
                "while it is in use: "
                + ", ".join(blockers)
            ),
        )

    deleted_id = department.id
    deleted_name = department.name

    db.delete(department)
    db.commit()

    record_audit_event(
        action="DEPARTMENT_DELETED",
        user_id=current_user.id,
        resource_type="department",
        resource_id=deleted_id,
        details=(
            f"Department deleted: "
            f"{deleted_name}"
        ),
        ip_address=get_client_ip(
            request
        ),
    )

    return {
        "message":
            "Department deleted successfully",
        "department_id":
            deleted_id,
        "department_name":
            deleted_name,
    }
