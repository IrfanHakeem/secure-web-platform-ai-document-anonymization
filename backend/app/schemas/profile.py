from pydantic import BaseModel


class ProfileResponse(BaseModel):
    id: int
    username: str
    full_name: str | None
    email: str | None
    role: str
    department_id: int | None
    department_name: str | None
    is_active: bool
    has_profile_photo: bool
    profile_photo_url: str | None


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = None
    email: str | None = None