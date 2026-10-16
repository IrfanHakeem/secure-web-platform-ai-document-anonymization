"""PostgreSQL-backed SECURA AI task runner for the ONE-WORKER internal FYP server.

The browser can navigate away because the task runs on the API server. Status is
persisted and queued/running tasks are retried on process startup. For scaling
beyond one Uvicorn process, replace the in-process executor with a proper
external worker and distributed leases. No progress percentages are invented.
"""
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Lock

from sqlalchemy import select, text

from app.core.database import Base, SessionLocal, engine
from app.models.anonymization_job import AnonymizationJob, utc_now
from app.models.document import Document
from app.services.audit_service import record_audit_event
from app.services.anonymization_progress import anonymize_with_checkpoints
from app.services.file_service import get_fernet

logger = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix='secura-ai')
_tasks_lock = Lock()
_tasks: set[str] = set()


class AnonymizationCancelled(Exception):
    """The owner requested cancellation; abort at a safe checkpoint."""



def init_anonymization_jobs() -> None:
    """Create only the NEW table, without modifying existing SECURA tables."""
    Base.metadata.create_all(bind=engine, tables=[AnonymizationJob.__table__])
    # Existing installations already have this table: add only these two
    # non-sensitive status columns, without resetting or dropping any data.
    with engine.begin() as conn:
        conn.execute(text("""ALTER TABLE anonymization_jobs
            ADD COLUMN IF NOT EXISTS progress_percent INTEGER NOT NULL DEFAULT 0"""))
        conn.execute(text("""ALTER TABLE anonymization_jobs
            ADD COLUMN IF NOT EXISTS progress_stage VARCHAR(96) NOT NULL DEFAULT 'Queued'"""))
    with SessionLocal() as db:
        tasks = db.scalars(select(AnonymizationJob).where(
            AnonymizationJob.status.in_(['QUEUED', 'PROCESSING', 'CANCEL_REQUESTED'])
        ).order_by(AnonymizationJob.created_at)).all()
        ids = []
        for job in tasks:
            if job.status == 'CANCEL_REQUESTED':
                job.status = 'CANCELLED'
                job.progress_stage = 'Cancelled after server restart'
                job.finished_at = utc_now()
                continue
            # Safe for the documented single-server-worker deployment.
            job.status = 'QUEUED'
            job.started_at = None
            job.progress_percent = 0
            job.progress_stage = 'Queued (recovered after restart)'
            ids.append(job.id)
        db.commit()
    for job_id in ids:
        schedule_anonymization_job(job_id)


def schedule_anonymization_job(job_id: str) -> None:
    with _tasks_lock:
        if job_id in _tasks:
            return
        _tasks.add(job_id)
    try:
        _executor.submit(_worker, job_id)
    except Exception:
        with _tasks_lock:
            _tasks.discard(job_id)
        raise



def _record_checkpoint(job_id: str, percent: int, stage: str) -> None:
    # Serialize with POST /cancel: a cancellation request is not just cosmetic.
    # Progress is only advanced after real work completes, never by a timer.
    with SessionLocal() as db:
        with db.begin():
            job = db.scalar(select(AnonymizationJob).where(
                AnonymizationJob.id == job_id
            ).with_for_update())
            if job is None or job.status in ('CANCEL_REQUESTED', 'CANCELLED'):
                raise AnonymizationCancelled()
            if job.status != 'PROCESSING':
                raise RuntimeError('The anonymization job is no longer running')
            if job.progress_percent < percent:
                job.progress_percent = percent
                job.progress_stage = stage


def _mark_cancelled(job_id: str) -> None:
    with SessionLocal() as db:
        with db.begin():
            job = db.scalar(select(AnonymizationJob).where(
                AnonymizationJob.id == job_id
            ).with_for_update())
            if job is not None and job.status in ('CANCEL_REQUESTED', 'CANCELLED'):
                job.status = 'CANCELLED'
                job.progress_stage = 'Cancelled by user'
                job.finished_at = utc_now()
                job.error_message = None
                job.encrypted_replacements = None
                job.pii_count = 0
                job.pii_counts = {}
                job.replacement_count = 0


def _worker(job_id: str) -> None:
    generated_path = None
    try:
        with SessionLocal() as db:
            with db.begin():
                job = db.scalar(select(AnonymizationJob).where(
                    AnonymizationJob.id == job_id
                ).with_for_update())
                if job is None or job.status != 'QUEUED':
                    return
                document = db.get(Document, job.document_id)
                if document is None or document.owner_id != job.owner_id:
                    job.status = 'FAILED'
                    job.error_message = 'The document is no longer available.'
                    job.finished_at = utc_now()
                    job.progress_stage = 'Document unavailable'
                    return
                if document.anonymized_file_path:
                    job.status = 'COMPLETED'
                    job.progress_percent = 100
                    job.progress_stage = 'Protected document already available'
                    job.finished_at = utc_now()
                    return
                job.status = 'PROCESSING'
                job.progress_percent = 10
                job.progress_stage = 'AI worker started'
                job.started_at = utc_now()
                job.error_message = None
                doc_id = document.id
                owner_id = job.owner_id
                # Copy required metadata before closing the database session.
                data = {
                    'encrypted_file_path': document.encrypted_file_path,
                    'sha256_hash': document.sha256_hash,
                    'file_type': document.file_type,
                }

        # The anonymizer needs the three Document fields; use a simple object.
        class DocumentInput:
            pass
        source = DocumentInput()
        for key, value in data.items():
            setattr(source, key, value)
        result = anonymize_with_checkpoints(
            source, lambda pct, stage: _record_checkpoint(job_id, pct, stage)
        )
        generated_path = Path(result['anonymized_file_path'])
        ciphertext = get_fernet().encrypt(
            json.dumps(result['replacements'], ensure_ascii=False).encode('utf-8')
        ).decode('ascii')

        with SessionLocal() as db:
            with db.begin():
                job = db.scalar(select(AnonymizationJob).where(
                    AnonymizationJob.id == job_id
                ).with_for_update())
                document = db.scalar(select(Document).where(
                    Document.id == doc_id
                ).with_for_update())
                if job is None or document is None or document.owner_id != owner_id:
                    raise RuntimeError('Anonymization target changed')
                if job.status in ('CANCEL_REQUESTED', 'CANCELLED'):
                    raise AnonymizationCancelled()
                if job.status != 'PROCESSING':
                    raise RuntimeError('Anonymization job state changed unexpectedly')
                if document.anonymized_file_path:
                    # A legacy request may have completed concurrently.
                    if generated_path.exists():
                        generated_path.unlink()
                    generated_path = None
                else:
                    document.anonymized_file_path = str(generated_path)
                    job.pii_count = result['pii_count']
                    job.pii_counts = result['pii_counts']
                    job.replacement_count = result['replacement_count']
                    job.encrypted_replacements = ciphertext
                job.status = 'COMPLETED'
                job.progress_percent = 100
                job.progress_stage = 'Saved and ready to download'
                job.finished_at = utc_now()
                job.error_message = None
            generated_path = None  # DB commit completed; output belongs to Document now.
        try:
            record_audit_event(
                action='DOCUMENT_ANONYMIZED', user_id=owner_id,
                resource_type='document', resource_id=doc_id,
                details=f'Document anonymized. PII detected: {result["pii_count"]}',
            )
        except Exception:
            logger.exception('Audit logging failed after job %s', job_id)
    except AnonymizationCancelled:
        logger.info('SECURA anonymization job %s cancelled at a safe checkpoint', job_id)
        if generated_path is not None:
            try:
                generated_path.unlink(missing_ok=True)
            except OSError:
                logger.warning('Unable to delete cancelled temporary output for %s', job_id)
        try:
            _mark_cancelled(job_id)
        except Exception:
            logger.exception('Could not persist cancellation for %s', job_id)
    except Exception:
        logger.exception('SECURA anonymization job %s failed', job_id)
        if generated_path is not None:
            try:
                generated_path.unlink(missing_ok=True)
            except OSError:
                logger.warning('Unable to remove temporary output for %s', job_id)
        try:
            with SessionLocal() as db:
                job = db.get(AnonymizationJob, job_id)
                if job is not None and job.status == 'CANCEL_REQUESTED':
                    job.status = 'CANCELLED'
                    job.progress_stage = 'Cancelled by user'
                    job.finished_at = utc_now()
                    job.error_message = None
                    db.commit()
                elif job is not None and job.status not in ('COMPLETED', 'CANCELLED'):
                    job.status = 'FAILED'
                    job.progress_stage = 'Processing failed; retry available'
                    job.finished_at = utc_now()
                    job.error_message = 'AI processing could not be completed. You can retry this document.'
                    db.commit()
        except Exception:
            logger.exception('Could not update failure status for %s', job_id)
    finally:
        with _tasks_lock:
            _tasks.discard(job_id)
