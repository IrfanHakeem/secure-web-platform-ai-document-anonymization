from app.models.document import Document
from app.services.file_service import (
    decrypt_and_verify_file,
)
from app.services.pii_detector import detect_pii
from app.services.text_extractor import extract_text


def analyze_document_content(
    data: bytes,
    file_type: str,
) -> dict:

    extracted_text = extract_text(
        data=data,
        file_type=file_type,
    )

    detections = detect_pii(
        extracted_text
    )

    pii_counts: dict[str, int] = {}

    for detection in detections:
        pii_type = detection["type"]

        pii_counts[pii_type] = (
            pii_counts.get(
                pii_type,
                0
            )
            + 1
        )

    return {
        "text_length":
            len(extracted_text),

        "pii_found":
            len(detections) > 0,

        "pii_count":
            len(detections),

        "pii_counts":
            pii_counts,

        "detections":
            detections,
    }


def analyze_encrypted_document(
    document: Document
) -> dict:

    decrypted_data = (
        decrypt_and_verify_file(
            encrypted_file_path=(
                document.encrypted_file_path
            ),
            expected_sha256=(
                document.sha256_hash
            ),
        )
    )

    analysis = analyze_document_content(
        data=decrypted_data,
        file_type=document.file_type,
    )

    return {
        "document_id":
            document.id,

        "filename":
            document.original_filename,

        "file_type":
            document.file_type,

        "integrity_verified":
            True,

        **analysis,
    }