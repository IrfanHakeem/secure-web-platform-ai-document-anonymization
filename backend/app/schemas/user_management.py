from typing import Literal

from pydantic import BaseModel


class AdminUserResponse(BaseModel):
    id: int
    username: str
    role: str
    department_id: int | None
    is_active: bool


class PasswordResetRequest(BaseModel):
    new_password: str


class AdminCreateUserRequest(BaseModel):
    username: str
    password: str

    role: Literal[
        "User",
        "Security Officer",
    ]

    department_id: int | None = None


class UserDepartmentUpdate(BaseModel):
    department_id: int