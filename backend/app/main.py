from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin_departments import (
    router as admin_departments_router,
)
from app.api.admin_users import (
    router as admin_users_router,
)
from app.api.ai_analysis import (
    router as ai_analysis_router,
)
from app.api.ai_report import (
    router as ai_report_router,
)
from app.api.anonymization import (
    router as anonymization_router,
)
from app.api.approved_original_access import (
    router as approved_original_access_router,
)
from app.api.auth import (
    router as auth_router,
)
from app.api.departments import (
    router as departments_router,
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
from app.api.profile import (
    router as profile_router,
)
from app.api.security_monitoring import (
    router as security_monitoring_router,
)


app = FastAPI(
    title=(
        "Secure Web Platform for Automated "
        "AI Document Anonymization"
    ),
    version="1.0.0",
)


# Development frontend origins.
# Do not use "*" because Secura uses authenticated API requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    auth_router
)

app.include_router(
    profile_router
)

app.include_router(
    departments_router
)

app.include_router(
    documents_router
)

app.include_router(
    ai_analysis_router
)

app.include_router(
    ai_report_router
)

app.include_router(
    anonymization_router
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
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }