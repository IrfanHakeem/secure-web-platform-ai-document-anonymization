from pydantic import BaseModel, Field


class AdminForgotPasswordRequest(BaseModel):
    email: str = Field(max_length=254)


class AdminVerifyOTPRequest(BaseModel):
    email: str = Field(max_length=254)
    otp: str = Field(
        min_length=6,
        max_length=6,
        pattern=r"^[0-9]{6}$",
    )


class AdminVerifyOTPResponse(BaseModel):
    reset_token: str
    token_type: str


class AdminResetPasswordRequest(BaseModel):
    reset_token: str = Field(
        min_length=1,
        max_length=4096,
    )
    new_password: str = Field(
        min_length=8,
        max_length=256,
    )