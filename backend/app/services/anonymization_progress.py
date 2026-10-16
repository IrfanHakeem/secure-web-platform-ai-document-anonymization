"""Milestone-based AI progress. Values mean completed workflow steps, NOT elapsed time.

Uses the SAME decryption, extraction, detection, replacement and format-specific
anonymizers as SECURA's existing document_anonymizer.py. Old endpoint remains intact.
"""
import uuid
from pathlib import Path
from typing import Callable

from app.services.file_service import decrypt_and_verify_file
from app.services.text_extractor import extract_text
from app.services.pii_detector import detect_pii
from app.services.anonymization_service import (
    build_replacement_map, remove_overlapping_detections,
)
from app.services import document_anonymizer as da

ProgressCallback = Callable[[int, str], None]


def anonymize_with_checkpoints(source, progress: ProgressCallback) -> dict:
    """Each progress update is sent only AFTER the corresponding step succeeds."""
    data = decrypt_and_verify_file(
        encrypted_file_path=source.encrypted_file_path,
        expected_sha256=source.sha256_hash,
    )
    progress(25, 'Original decrypted and integrity verified')

    file_type = str(source.file_type).lower().strip().lstrip('.')
    text = extract_text(data=data, file_type=file_type)
    progress(40, 'Document text extracted')

    detections = remove_overlapping_detections(detect_pii(text))
    progress(60, 'Sensitive information detected')

    typed_map = build_replacement_map(detections)
    string_map = da.build_string_replacement_map(typed_map)
    replacements = da.build_replacement_records(typed_map)
    progress(75, 'Privacy-safe replacements prepared')

    anonymizers = {
        'txt': da.anonymize_txt, 'csv': da.anonymize_csv,
        'docx': da.anonymize_docx, 'xlsx': da.anonymize_xlsx,
        'pdf': da.anonymize_pdf,
    }
    anonymizer = anonymizers.get(file_type)
    if anonymizer is None:
        raise ValueError('Unsupported file type for anonymization')
    output_bytes = anonymizer(data, string_map)
    progress(85, 'Protected document generated')

    pii_counts = {}
    for detection in detections:
        kind = detection['type']
        pii_counts[kind] = pii_counts.get(kind, 0) + 1

    # The anonymization output contains only protected data, and stays inside
    # the same secured storage directory as the original SECURA workflow.
    output_path = da.ANONYMIZED_STORAGE / f'{uuid.uuid4().hex}.{file_type}'
    output_path.write_bytes(output_bytes)
    try:
        progress(90, 'Protected file written; saving results')
    except Exception:
        # Avoid leaving an orphaned protected file if the status DB is down.
        output_path.unlink(missing_ok=True)
        raise
    return {
        'anonymized_file_path': str(output_path),
        'pii_count': len(detections),
        'pii_counts': pii_counts,
        'replacement_count': len(string_map),
        'replacements': replacements,
    }
