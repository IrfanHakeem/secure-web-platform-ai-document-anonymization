from fastapi import FastAPI

app = FastAPI(
    title="Secure Web Platform for Automated AI Document Anonymization",
    version="1.0.0"
)

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
