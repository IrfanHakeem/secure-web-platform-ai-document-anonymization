import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

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
from app.api.anonymization_jobs import (
    router as anonymization_jobs_router,
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
from app.services.anonymization_jobs import (
    init_anonymization_jobs,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # SECURA V15.6: set up the new AI job table and resume unfinished jobs.
    # Existing SECURA database tables are not altered here.
    init_anonymization_jobs()
    yield


app = FastAPI(
    title=(
        "Secure Web Platform for Automated "
        "AI Document Anonymization"
    ),
    version="1.0.0",
    lifespan=lifespan,
)


logger = logging.getLogger("secura")


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: Request,
    exc: Exception,
) -> JSONResponse:
    # Log the full traceback server-side, return a generic body
    # so no internals leak to the client.
    logger.exception(
        "Unhandled exception on %s %s",
        request.method,
        request.url.path,
        exc_info=exc,
    )

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# Development frontend origins.
# Do not use "*" because Secura uses authenticated API requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
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

# SECURA V15.6: new asynchronous job-status endpoints.
# The existing /anonymization endpoint above is preserved.
app.include_router(
    anonymization_jobs_router
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
