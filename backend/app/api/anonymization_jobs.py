"""Owner-scoped persistent document anonymization status + report APIs."""
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.anonymization_job import AnonymizationJob, utc_now
from app.models.document import Document
from app.models.user import User
from app.schemas.anonymization_job import (
    JobStatusResponse, ReplacementReportResponse, StartAnonymizationJob,
)
from app.services.anonymization_jobs import schedule_anonymization_job
from app.services.file_service import get_fernet
from app.services.audit_service import record_audit_event

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/anonymization-jobs', tags=['Anonymization Jobs'])


def _serialize(job: AnonymizationJob, document: Document) -> JobStatusResponse:
    return JobStatusResponse(
        job_id=job.id, document_id=document.id,
        filename=document.original_filename, file_size=document.file_size,
        status=job.status,
        progress_percent=job.progress_percent,
        progress_stage=job.progress_stage,
        pii_count=job.pii_count,
        pii_counts=job.pii_counts or {}, replacement_count=job.replacement_count,
        anonymized_ready=job.status == 'COMPLETED' and bool(document.anonymized_file_path),
        error=job.error_message, created_at=job.created_at,
        started_at=job.started_at, finished_at=job.finished_at,
    )


def _my_job(job_id: str, user: User, db: Session) -> tuple[AnonymizationJob, Document]:
    # 404 for both non-existent and non-owned IDs: no existence disclosure.
    job = db.scalar(select(AnonymizationJob).where(
        AnonymizationJob.id == job_id,
        AnonymizationJob.owner_id == user.id,
    ))
    if job is None:
        raise HTTPException(status_code=404, detail='Job not found')
    document = db.get(Document, job.document_id)
    if document is None or document.owner_id != user.id:
        raise HTTPException(status_code=404, detail='Job not found')
    return job, document


@router.post('', response_model=JobStatusResponse, status_code=status.HTTP_202_ACCEPTED)
def start_job(
    payload: StartAnonymizationJob,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Lock document first, serializing simultaneous requests for the same doc.
    document = db.scalar(select(Document).where(
        Document.id == payload.document_id,
        Document.owner_id == user.id,
    ).with_for_update())
    if document is None:
        raise HTTPException(status_code=404, detail='Document not found')
    job = db.scalar(select(AnonymizationJob).where(
        AnonymizationJob.document_id == document.id
    ).with_for_update())
    if document.anonymized_file_path and job is None:
        raise HTTPException(status_code=409, detail='This file is already available in your library')
    if job is None:
        job = AnonymizationJob(document_id=document.id, owner_id=user.id, status='QUEUED')
        db.add(job)
        db.flush()
    elif job.status == 'FAILED' and not document.anonymized_file_path:
        # Explicitly retry failed jobs only when the owner presses the action.
        job.status = 'QUEUED'
        job.error_message = None
        job.started_at = None
        job.finished_at = None
        job.pii_count = 0
        job.pii_counts = {}
        job.replacement_count = 0
        job.encrypted_replacements = None
        job.progress_percent = 0
        job.progress_stage = 'Queued'
    if job.status == 'CANCELLED':
        raise HTTPException(status_code=409, detail='This run was cancelled. Upload the file again to start a new job.')
    db.commit()
    db.refresh(job)
    if job.status == 'QUEUED':
        schedule_anonymization_job(job.id)
    return _serialize(job, document)


@router.post('/{job_id}/cancel', response_model=JobStatusResponse)
def cancel_job(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # The owner and job are checked before any mutation. Row lock serializes
    # cancellation against the worker's final document publication transaction.
    # Auth dependency may have opened this shared request-scoped transaction.
    job = db.scalar(select(AnonymizationJob).where(
        AnonymizationJob.id == job_id,
        AnonymizationJob.owner_id == user.id,
    ).with_for_update())
    if job is None:
        raise HTTPException(status_code=404, detail='Job not found')
    document = db.get(Document, job.document_id)
    if document is None or document.owner_id != user.id:
        raise HTTPException(status_code=404, detail='Job not found')

    if job.status == 'QUEUED':
        job.status = 'CANCELLED'
        job.progress_stage = 'Cancelled before processing started'
        job.finished_at = utc_now()
    elif job.status == 'PROCESSING':
        job.status = 'CANCEL_REQUESTED'
        job.progress_stage = 'Cancellation requested; waiting for current AI stage'
    elif job.status not in ('CANCEL_REQUESTED', 'CANCELLED'):
        raise HTTPException(
            status_code=409,
            detail='This job is already finished and cannot be cancelled',
        )
    db.commit()
    db.refresh(job)
    response = _serialize(job, document)

    # No original text or replacement mapping is included in audit details.
    try:
        record_audit_event(
            action='ANONYMIZATION_CANCEL_REQUESTED',
            user_id=user.id,
            resource_type='document',
            resource_id=document.id,
            details=f'Cancel requested for anonymization job {job.id}',
        )
    except Exception:
        # Cancellation must remain effective even if audit storage is down.
        logger.exception('Unable to write anonymization cancellation audit event')
    return response


@router.get('/recent', response_model=list[JobStatusResponse])
def recent_jobs(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    jobs = db.scalars(select(AnonymizationJob).where(
        AnonymizationJob.owner_id == user.id,
    ).order_by(AnonymizationJob.created_at.desc()).limit(12)).all()
    docs = {doc.id: doc for doc in db.scalars(select(Document).where(
        Document.id.in_([j.document_id for j in jobs]), Document.owner_id == user.id
    )).all()} if jobs else {}
    return [_serialize(job, docs[job.document_id]) for job in jobs if job.document_id in docs]


@router.get('/{job_id}', response_model=JobStatusResponse)
def job_status(
    job_id: str, user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job, document = _my_job(job_id, user, db)
    return _serialize(job, document)


@router.get('/{job_id}/replacements', response_model=ReplacementReportResponse)
def job_replacements(
    job_id: str, user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job, document = _my_job(job_id, user, db)
    if job.status != 'COMPLETED' or not document.anonymized_file_path:
        raise HTTPException(status_code=409, detail='The report is not available yet')
    if not job.encrypted_replacements:
        return ReplacementReportResponse(job_id=job.id, replacements=[])
    try:
        replacements = json.loads(get_fernet().decrypt(
            job.encrypted_replacements.encode('ascii')
        ).decode('utf-8'))
    except Exception as error:
        raise HTTPException(status_code=409, detail='Unable to open the encrypted report') from error
    return ReplacementReportResponse(job_id=job.id, replacements=replacements)
