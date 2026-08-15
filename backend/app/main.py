from fastapi import FastAPI

from app.api.auth import router as auth_router
from app.api.documents import router as documents_router
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
    original_file_requests_router
)

app.include_router(
    security_monitoring_router
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