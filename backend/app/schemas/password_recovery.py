from pydantic import BaseModel


class AdminForgotPasswordRequest(BaseModel):
    email: str


class AdminVerifyOTPRequest(BaseModel):
    email: str
    otp: str


class AdminVerifyOTPResponse(BaseModel):
    reset_token: str
    token_type: str


class AdminResetPasswordRequest(BaseModel):
    reset_token: str
    new_password: str