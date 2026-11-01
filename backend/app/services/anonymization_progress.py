"""Checkpoints bridged to SECURA's currently deployed and tested anonymizer.

Do NOT import the older GitHub document_anonymizer here: Member 1's live
version contains the 25 MiB CSV optimizations that must remain unchanged.

Percentages denote finished workflow stages, not guessed elapsed-time progress.
The intensive NLP + replacement phase is a single cancellable *afterwards*
checkpoint. Client-side cancellation may wait for that phase to finish.
"""
import os
import uuid
from pathlib import Path
from typing import Any, Callable

from app.services.document_anonymizer import (
    ANONYMIZED_STORAGE,
    anonymize_document_bytes,
)
from app.services.file_service import decrypt_and_verify_file


def anonymize_with_checkpoints(
    source: Any,
    checkpoint: Callable[[int, str], None],
) -> dict:
    """Run the production anonymizer, return exactly the job worker's contract."""
    checkpoint(15, 'Verifying encrypted original')
    decrypted = decrypt_and_verify_file(
        encrypted_file_path=source.encrypted_file_path,
        expected_sha256=source.sha256_hash,
    )
    checkpoint(30, 'Original verified; analyzing sensitive information')

    # Tested 25 MiB path: leave spaCy batching and CSV matcher intact.
    result = anonymize_document_bytes(
        data=decrypted,
        file_type=source.file_type,
    )
    checkpoint(85, 'AI detection and anonymization completed')

    extension = source.file_type.lower().strip().lstrip('.')
    # Input file type already validated by upload route and anonymizer.
    output = ANONYMIZED_STORAGE / f'{uuid.uuid4().hex}.{extension}'
    temp = output.with_name(output.name + '.writing')
    try:
        checkpoint(90, 'Writing protected document')
        with temp.open('xb') as destination:
            destination.write(result['data'])
            destination.flush()
            os.fsync(destination.fileno())
        os.replace(temp, output)
        checkpoint(95, 'Protected document stored')
    except BaseException:
        temp.unlink(missing_ok=True)
        output.unlink(missing_ok=True)
        raise

    return {
        'anonymized_file_path': str(output),
        'pii_count': result['pii_count'],
        'pii_counts': result['pii_counts'],
        'replacement_count': result['replacement_count'],
        'replacements': result['replacements'],
    }
