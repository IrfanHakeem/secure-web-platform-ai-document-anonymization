from typing import Literal

from pydantic import BaseModel


class AdminUserResponse(BaseModel):
    id: int
    username: str
    full_name: str | None
    email: str | None
    role: str
    department_id: int | None
    department_name: str | None
    is_active: bool


class PasswordResetRequest(BaseModel):
    new_password: str


class AdminCreateUserRequest(BaseModel):
    full_name: str
    username: str
    email: str
    password: str

    role: Literal[
        "User",
        "Security Officer",
    ]

    department_id: int | None = None


class UserDepartmentUpdate(BaseModel):
    department_id: int


class UserStatusUpdate(BaseModel):
    is_active: bool
