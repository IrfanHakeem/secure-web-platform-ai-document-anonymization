import csv
import hashlib
import io
import os
import uuid
import zipfile
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv
from fastapi import HTTPException, UploadFile, status


load_dotenv()


ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".txt",
    ".xlsx",
    ".csv",
}

MAX_FILE_SIZE_MB = int(
    os.getenv("MAX_FILE_SIZE_MB", "25")
)

MAX_FILE_SIZE_BYTES = (
    MAX_FILE_SIZE_MB * 1024 * 1024
)

STORAGE_ROOT = Path("storage")
ORIGINAL_STORAGE = STORAGE_ROOT / "originals"
ANONYMIZED_STORAGE = STORAGE_ROOT / "anonymized"

ORIGINAL_STORAGE.mkdir(
    parents=True,
    exist_ok=True
)

ANONYMIZED_STORAGE.mkdir(
    parents=True,
    exist_ok=True
)


def get_fernet() -> Fernet:
    encryption_key = os.getenv(
        "ENCRYPTION_KEY"
    )

    if not encryption_key:
        raise RuntimeError(
            "ENCRYPTION_KEY is not configured."
        )

    return Fernet(
        encryption_key.encode("utf-8")
    )


def calculate_sha256(
    data: bytes
) -> str:

    return hashlib.sha256(
        data
    ).hexdigest()


def validate_pdf(
    data: bytes
) -> bool:

    return data.startswith(
        b"%PDF-"
    )


def validate_docx(
    data: bytes
) -> bool:

    try:
        with zipfile.ZipFile(
            io.BytesIO(data)
        ) as archive:

            names = set(
                archive.namelist()
            )

            return (
                "[Content_Types].xml" in names
                and
                "word/document.xml" in names
            )

    except zipfile.BadZipFile:
        return False


def validate_xlsx(
    data: bytes
) -> bool:

    try:
        with zipfile.ZipFile(
            io.BytesIO(data)
        ) as archive:

            names = set(
                archive.namelist()
            )

            return (
                "[Content_Types].xml" in names
                and
                "xl/workbook.xml" in names
            )

    except zipfile.BadZipFile:
        return False


def validate_text(
    data: bytes
) -> bool:

    try:
        data.decode("utf-8")
        return True

    except UnicodeDecodeError:
        return False


def validate_csv(
    data: bytes
) -> bool:

    try:
        text = data.decode(
            "utf-8"
        )

        reader = csv.reader(
            io.StringIO(text)
        )

        next(
            reader,
            None
        )

        return True

    except (
        UnicodeDecodeError,
        csv.Error
    ):
        return False


def validate_file_structure(
    extension: str,
    data: bytes
) -> bool:

    validators = {
        ".pdf": validate_pdf,
        ".docx": validate_docx,
        ".xlsx": validate_xlsx,
        ".txt": validate_text,
        ".csv": validate_csv,
    }

    validator = validators.get(
        extension
    )

    if validator is None:
        return False

    return validator(data)


async def process_uploaded_file(
    upload_file: UploadFile
) -> dict:

    if not upload_file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required"
        )

    extension = Path(
        upload_file.filename
    ).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type"
        )

    data = await upload_file.read()

    if not data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty"
        )

    if len(data) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"Maximum file size is "
                f"{MAX_FILE_SIZE_MB} MB"
            )
        )

    if not validate_file_structure(
        extension,
        data
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file structure"
        )

    sha256_hash = calculate_sha256(
        data
    )

    encrypted_data = get_fernet().encrypt(
        data
    )

    stored_filename = (
        f"{uuid.uuid4().hex}.enc"
    )

    storage_path = (
        ORIGINAL_STORAGE
        / stored_filename
    )

    storage_path.write_bytes(
        encrypted_data
    )

    return {
        "original_filename":
            upload_file.filename,

        "file_type":
            extension.lstrip("."),

        "file_size":
            len(data),

        "sha256_hash":
            sha256_hash,

        "encrypted_file_path":
            str(storage_path),
    }


def decrypt_and_verify_file(
    encrypted_file_path: str,
    expected_sha256: str
) -> bytes:

    file_path = Path(
        encrypted_file_path
    )

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encrypted file not found"
        )

    encrypted_data = (
        file_path.read_bytes()
    )

    try:
        decrypted_data = (
            get_fernet().decrypt(
                encrypted_data
            )
        )

    except InvalidToken:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Encrypted file integrity "
                "check failed"
            )
        )

    actual_sha256 = calculate_sha256(
        decrypted_data
    )

    if actual_sha256 != expected_sha256:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Document integrity "
                "verification failed"
            )
        )

    return decrypted_data


def retrieve_original_file(
    encrypted_file_path: str,
    expected_sha256: str
) -> bytes:

    return decrypt_and_verify_file(
        encrypted_file_path=encrypted_file_path,
        expected_sha256=expected_sha256
    )