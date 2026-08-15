from pydantic import BaseModel


class AdminUserResponse(BaseModel):
    id: int
    username: str
    role: str
    department_id: int | None
    is_active: bool


class PasswordResetRequest(BaseModel):
    new_password: str