from datetime import datetime

from pydantic import BaseModel


class DocumentUploadResponse(BaseModel):
    id: int
    original_filename: str
    file_type: str
    file_size: int
    sha256_hash: str
    is_private: bool
    created_at: datetime