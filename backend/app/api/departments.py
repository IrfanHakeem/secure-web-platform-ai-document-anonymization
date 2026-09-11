from fastapi import (
    APIRouter,
    Depends,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.department import Department
from app.models.user import User
from app.schemas.department import (
    DepartmentResponse,
)


router = APIRouter(
    prefix="/departments",
    tags=["Departments"]
)


@router.get(
    "",
    response_model=list[DepartmentResponse]
)
def list_departments(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):
    departments = db.scalars(
        select(
            Department
        ).order_by(
            Department.name
        )
    ).all()

    return departments