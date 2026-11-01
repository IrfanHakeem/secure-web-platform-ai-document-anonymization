from __future__ import annotations

import io
import re
import zipfile
from pathlib import Path

from fastapi import HTTPException, UploadFile, status


# ============================================================
# Configuration
# ============================================================

MAX_FILE_SIZE = 100 * 1024 * 1024  # 25 MB

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".txt",
    ".xlsx",
    ".csv",
}

ALLOWED_MIME_TYPES = {
    ".pdf": {
        "application/pdf",
    },
    ".docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
        "application/octet-stream",
    },
    ".xlsx": {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/zip",
        "application/octet-stream",
    },
    ".txt": {
        "text/plain",
        "application/octet-stream",
    },
    ".csv": {
        "text/csv",
        "application/csv",
        "application/vnd.ms-excel",
        "application/octet-stream",
        "text/plain",
    },
}


# ============================================================
# Public entry point
# ============================================================

async def validate_uploaded_file(file: UploadFile) -> bytes:
    """
    Read and validate an uploaded document before it enters
    the document-processing/anonymization pipeline.

    Returns:
        bytes: validated file content

    Raises:
        HTTPException: when the upload fails a security check.
    """

    filename = file.filename or ""

    validate_filename(filename)

    extension = Path(filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format.",
        )

    data = await file.read()

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 25 MB upload limit.",
        )

    validate_mime_type(file.content_type, extension)

    validate_file_signature(data, extension)

    if extension == ".pdf":
        validate_pdf(data)

    elif extension in {".docx", ".xlsx"}:
        validate_office_zip(data, extension)

    elif extension in {".txt", ".csv"}:
        validate_text_file(data, extension)

    return data


# ============================================================
# Filename security
# ============================================================

def validate_filename(filename: str) -> None:
    """
    Prevent path traversal and suspicious filenames.
    """

    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required.",
        )

    if len(filename) > 255:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is too long.",
        )

    # Never allow directory separators.
    if "/" in filename or "\\" in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename.",
        )

    # Prevent traversal attempts.
    if ".." in filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid filename.",
        )

    # Reject control characters.
    if any(ord(char) < 32 for char in filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename contains invalid characters.",
        )


# ============================================================
# MIME validation
# ============================================================

def validate_mime_type(
    content_type: str | None,
    extension: str,
) -> None:
    """
    Check the browser-provided MIME type against the allowed
    MIME types for the selected extension.

    Magic-byte validation below remains the authoritative check.
    """

    if not content_type:
        return

    allowed = ALLOWED_MIME_TYPES.get(extension, set())

    if content_type.lower() not in {
        value.lower() for value in allowed
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type does not match the selected format.",
        )


# ============================================================
# File signature / magic-byte validation
# ============================================================

def validate_file_signature(
    data: bytes,
    extension: str,
) -> None:

    if extension == ".pdf":
        if not data.startswith(b"%PDF-"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid PDF file.",
            )

        return

    if extension in {".docx", ".xlsx"}:
        # DOCX/XLSX are ZIP-based Office Open XML files.
        if not data.startswith(b"PK"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid Office document.",
            )

        return

    if extension in {".txt", ".csv"}:
        # Text formats do not have a universal magic byte.
        # UTF-8 validation is performed separately.
        return


# ============================================================
# PDF security
# ============================================================

def validate_pdf(data: bytes) -> None:
    """
    Reject common active-content / embedded-content structures
    before the PDF reaches the document parser.
    """

    lower_data = data.lower()

    dangerous_pdf_markers = (
        b"/javascript",
        b"/js",
        b"/openaction",
        b"/aa",
        b"/launch",
        b"/embeddedfile",
        b"/filespec",
        b"/richmedia",
        b"/3d",
        b"/xfa",
        b"/submitform",
        b"/importdata",
    )

    for marker in dangerous_pdf_markers:
        if marker in lower_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="PDF contains unsupported active or embedded content.",
            )

    # Basic sanity check.
    if b"%%EOF" not in data[-4096:]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF appears incomplete or corrupted.",
        )


# ============================================================
# DOCX / XLSX security
# ============================================================

def validate_office_zip(
    data: bytes,
    extension: str,
) -> None:

    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Office document structure.",
        )

    entries = archive.infolist()

    # Protection against ZIP bombs.
    max_entries = 5000
    max_uncompressed_size = 100 * 1024 * 1024  # 100 MB

    if len(entries) > max_entries:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Office document contains too many internal files.",
        )

    total_uncompressed = 0

    for entry in entries:
        total_uncompressed += entry.file_size

        if entry.file_size > max_uncompressed_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Office document contains an oversized internal file.",
            )

        if total_uncompressed > max_uncompressed_size:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Office document exceeds the allowed decompression size.",
            )

        # Prevent path traversal inside ZIP.
        normalized = Path(entry.filename)

        if normalized.is_absolute() or ".." in normalized.parts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Office document contains an invalid internal path.",
            )

    names = {
        entry.filename.lower()
        for entry in entries
    }

    # Reject macro-enabled / executable Office content.
    dangerous_extensions = (
        ".vba",
        ".bin",
        ".exe",
        ".dll",
        ".js",
        ".vbs",
        ".ps1",
        ".bat",
        ".cmd",
    )

    for name in names:
        if name.endswith(dangerous_extensions):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Office document contains unsupported active content.",
            )

    # Reject common embedded object locations.
    dangerous_paths = (
        "word/embeddings/",
        "xl/embeddings/",
        "word/activeX/",
        "xl/activeX/",
    )

    for name in names:
        if any(name.startswith(path) for path in dangerous_paths):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Office document contains embedded or active objects.",
            )

    # Reject external relationships.
    for name in names:
        if name.endswith(".rels"):
            try:
                relationship_data = archive.read(name).lower()
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Unable to validate Office relationships.",
                )

            if (
                b"targetmode=\"external\"" in relationship_data
                or b"targetmode='external'" in relationship_data
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Office document contains external relationships.",
                )

    # Make sure the expected OOXML structure exists.
    if "[content_types].xml" not in names:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Office document structure.",
        )

    if extension == ".docx":
        if not any(name.startswith("word/") for name in names):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid DOCX document structure.",
            )

    if extension == ".xlsx":
        if not any(name.startswith("xl/") for name in names):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid XLSX document structure.",
            )


# ============================================================
# TXT / CSV security
# ============================================================

def validate_text_file(
    data: bytes,
    extension: str,
) -> None:

    # Reject UTF-8 files containing invalid byte sequences.
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text file must use valid UTF-8 encoding.",
        )

    # Prevent excessively large individual text lines.
    max_line_length = 1_000_000

    for line in text.splitlines():
        if len(line) > max_line_length:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text file contains an excessively long line.",
            )

    if extension == ".csv":
        validate_csv_content(text)


def validate_csv_content(text: str) -> None:
    """
    Detect potentially dangerous spreadsheet formulas.

    This does not reject normal data containing '=' somewhere
    in the middle of a field. It focuses on formula-like values
    at the beginning of CSV cells.
    """

    dangerous_prefixes = (
        "=",
        "+",
        "-",
        "@",
    )

    for line in text.splitlines():

        cells = line.split(",")

        for cell in cells:
            value = cell.strip().lstrip("\ufeff")

            if value.startswith(dangerous_prefixes):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="CSV contains potentially unsafe spreadsheet formula content.",
                )


# ============================================================
# Safe text normalization
# ============================================================

def sanitize_extracted_text(text: str) -> str:
    """
    Normalize extracted document text before it is displayed
    or passed into downstream processing.

    This is NOT a replacement for HTML sanitization.
    Frontend should still render text as text, not HTML.
    """

    if not text:
        return ""

    # Remove NULL bytes and dangerous control characters.
    cleaned = "".join(
        char
        for char in text
        if char in "\n\r\t"
        or ord(char) >= 32
    )

    return cleaned


# ============================================================
# CSV output protection
# ============================================================

def neutralize_csv_formula(value: str) -> str:
    """
    Prevent a generated CSV cell from being interpreted as a
    spreadsheet formula when opened in Excel/LibreOffice.
    """

    if not value:
        return value

    stripped = value.lstrip()

    if stripped.startswith(("=", "+", "-", "@")):
        return "'" + value

    return value