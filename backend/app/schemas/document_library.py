from datetime import datetime

from pydantic import BaseModel


class AnonymizedDocumentResponse(BaseModel):
    id: int
    original_filename: str
    file_type: str
    file_size: int
    owner_id: int
    owner_username: str
    is_private: bool
    created_at: datetime


class ShareDocumentRequest(BaseModel):
    department_id: int


class ShareDocumentResponse(BaseModel):
    document_id: int
    department_id: int
    department_name: str
    shared: bool