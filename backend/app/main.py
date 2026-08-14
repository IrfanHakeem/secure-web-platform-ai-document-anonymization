
from fastapi import FastAPI

from app.api.auth import router as auth_router


app = FastAPI(
    title="Secure Web Platform for Automated AI Document Anonymization",
    version="1.0.0"
)


app.include_router(auth_router)


@app.get("/")
def root():
    return {
        "message": "Secure Web Platform for Automated AI Document Anonymization",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }