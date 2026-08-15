from fastapi import FastAPI

from app.api.admin_departments import (
    router as admin_departments_router,
)
from app.api.admin_users import (
    router as admin_users_router,
)
from app.api.approved_original_access import (
    router as approved_original_access_router,
)
from app.api.auth import (
    router as auth_router,
)
from app.api.document_library import (
    router as document_library_router,
)
from app.api.documents import (
    router as documents_router,
)
from app.api.original_file_requests import (
    router as original_file_requests_router,
)
from app.api.security_monitoring import (
    router as security_monitoring_router,
)


app = FastAPI(
    title=(
        "Secure Web Platform for Automated "
        "AI Document Anonymization"
    ),
    version="1.0.0"
)


app.include_router(auth_router)

app.include_router(
    documents_router
)

app.include_router(
    document_library_router
)

app.include_router(
    original_file_requests_router
)

app.include_router(
    approved_original_access_router
)

app.include_router(
    security_monitoring_router
)

app.include_router(
    admin_users_router
)

app.include_router(
    admin_departments_router
)


@app.get("/")
def root():
    return {
        "message": (
            "Secure Web Platform for Automated "
            "AI Document Anonymization"
        ),
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }