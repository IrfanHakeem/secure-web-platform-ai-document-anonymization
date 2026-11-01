
import csv
import hashlib
import io
import os
import uuid
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken
from dotenv import load_dotenv
from fastapi import HTTPException, UploadFile
from pypdf import PdfReader

load_dotenv()

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".txt", ".csv"}
MAX_FILE_SIZE_MB = max(1, int(os.getenv("MAX_FILE_SIZE_MB", "100")))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
MAX_ZIP_ENTRIES = 5000
MAX_ZIP_UNCOMPRESSED_SIZE = 100 * 1024 * 1024
MAX_ZIP_COMPRESSION_RATIO = 100
MAX_XML_PART_BYTES = 10 * 1024 * 1024
MAX_TEXT_LINE_LENGTH = 1_000_000

STORAGE_ROOT = Path("storage")
ORIGINAL_STORAGE = STORAGE_ROOT / "originals"
ANONYMIZED_STORAGE = STORAGE_ROOT / "anonymized"
ORIGINAL_STORAGE.mkdir(parents=True, exist_ok=True)
ANONYMIZED_STORAGE.mkdir(parents=True, exist_ok=True)


def get_fernet() -> Fernet:
    key = os.getenv("ENCRYPTION_KEY")
    if not key:
        raise RuntimeError("ENCRYPTION_KEY is not configured")
    return Fernet(key.encode("utf-8"))


def calculate_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def validate_filename(filename: str) -> bool:
    if not filename or len(filename) > 255 or filename in {".", ".."}:
        return False
    if ".." in filename or filename[-1] in {".", " "}:
        return False
    if any(c in filename for c in '/\\<>:"|?*'):
        return False
    if any(ord(c) < 32 or ord(c) == 127 for c in filename):
        return False

    reserved = {"CON", "PRN", "AUX", "NUL"}
    reserved |= {f"COM{i}" for i in range(1, 10)}
    reserved |= {f"LPT{i}" for i in range(1, 10)}

    return filename.split(".")[0].upper() not in reserved


PDF_ACTIVE_MARKERS = (
    b"/javascript",
    b"/js",
    b"/openaction",
    b"/aa",
    b"/launch",
    b"/submitform",
    b"/gotor",
    b"/importdata",
    b"/richmedia",
    b"/embeddedfile",
    b"/filespec",
    b"/xfa",
)


def validate_pdf(data: bytes) -> bool:
    if not data.startswith(b"%PDF-") or b"%%EOF" not in data[-4096:]:
        return False

    try:
        reader = PdfReader(io.BytesIO(data), strict=False)
        return not reader.is_encrypted and len(reader.pages) > 0
    except Exception:
        return False


def contains_pdf_active_content(data: bytes) -> bool:
    if any(marker in data.lower() for marker in PDF_ACTIVE_MARKERS):
        return True

    try:
        reader = PdfReader(io.BytesIO(data), strict=False)
        root = reader.trailer["/Root"]

        if any(key in root for key in ("/OpenAction", "/AA")):
            return True

        names = root.get("/Names")
        if names and any(
            key in names.get_object()
            for key in ("/JavaScript", "/EmbeddedFiles")
        ):
            return True

        form = root.get("/AcroForm")
        if form and "/XFA" in form.get_object():
            return True

        for page in reader.pages:
            if any(key in page for key in ("/AA", "/OpenAction")):
                return True

            for annotation in page.get("/Annots", []):
                obj = annotation.get_object()
                if any(
                    key in obj
                    for key in ("/A", "/AA", "/RichMediaContent")
                ):
                    return True

        return False

    except Exception:
        return True


def _safe_xml(data: bytes):
    if len(data) > MAX_XML_PART_BYTES:
        raise ValueError("XML part too large")

    if b"<!doctype" in data.lower() or b"<!entity" in data.lower():
        raise ValueError("XML entity/DTD not permitted")

    return ET.fromstring(data)


def _validate_zip_archive(
    data: bytes,
    required_files: set[str],
) -> bool:
    if not data.startswith(b"PK\x03\x04"):
        return False

    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            entries = archive.infolist()

            if not entries or len(entries) > MAX_ZIP_ENTRIES:
                return False

            names = set()
            total_size = 0

            for info in entries:
                name = info.filename.replace("\\", "/")
                parts = name.split("/")

                if (
                    not name
                    or name.startswith("/")
                    or ":" in name
                    or any(
                        part in {"", ".", ".."}
                        for part in parts[:-1]
                    )
                    or ".." in parts
                    or "\x00" in name
                    or name.lower() in names
                    or info.flag_bits & 1
                    or (
                        (info.external_attr >> 16) & 0o170000
                    ) == 0o120000
                ):
                    return False

                names.add(name.lower())
                total_size += info.file_size

                if (
                    info.file_size > MAX_ZIP_UNCOMPRESSED_SIZE
                    or total_size > MAX_ZIP_UNCOMPRESSED_SIZE
                    or (info.file_size and not info.compress_size)
                    or (
                        info.compress_size
                        and info.file_size / info.compress_size
                        > MAX_ZIP_COMPRESSION_RATIO
                    )
                ):
                    return False

            if not {
                name.lower() for name in required_files
            }.issubset(names):
                return False

            required_roots = {
                "[Content_Types].xml": "Types",
                "word/document.xml": "document",
                "xl/workbook.xml": "workbook",
            }

            for name in required_files:
                root = _safe_xml(archive.read(name))

                if not root.tag.endswith(required_roots[name]):
                    return False

            return archive.testzip() is None

    except (
        zipfile.BadZipFile,
        OSError,
        ValueError,
        RuntimeError,
        ET.ParseError,
        KeyError,
        EOFError,
        NotImplementedError,
    ):
        return False


def validate_docx(data: bytes) -> bool:
    return _validate_zip_archive(
        data,
        {"[Content_Types].xml", "word/document.xml"},
    )


def validate_xlsx(data: bytes) -> bool:
    return _validate_zip_archive(
        data,
        {"[Content_Types].xml", "xl/workbook.xml"},
    )


def contains_unsafe_office_content(data: bytes) -> bool:
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            for name in archive.namelist():
                lowered = name.lower()

                if (
                    lowered.endswith((
                        ".bin", ".exe", ".dll", ".js",
                        ".vbs", ".ps1", ".bat", ".cmd",
                        ".com", ".scr",
                    ))
                    or any(
                        part in lowered
                        for part in (
                            "vbaproject",
                            "/embeddings/",
                            "/activex/",
                            "/externallinks/",
                            "/oleobjects/",
                        )
                    )
                ):
                    return True

                if lowered == "[content_types].xml":
                    content = archive.read(name).lower()

                    if any(
                        marker in content
                        for marker in (
                            b"macroenabled",
                            b"vnd.ms-office.activex",
                            b"vbaproject",
                            b"oleobject",
                        )
                    ):
                        return True

                if lowered.endswith(".rels"):
                    root = _safe_xml(archive.read(name))

                    for relationship in root:
                        attrs = {
                            key.rsplit("}", 1)[-1].lower():
                            value.lower()
                            for key, value
                            in relationship.attrib.items()
                        }

                        if attrs.get("targetmode") == "external":
                            return True

                        if (
                            attrs.get("type", "").rsplit("/", 1)[-1]
                            in {
                                "oleobject",
                                "package",
                                "attachedtemplate",
                            }
                        ):
                            return True

            return False

    except (
        zipfile.BadZipFile,
        OSError,
        ValueError,
        RuntimeError,
        ET.ParseError,
        KeyError,
    ):
        return True


def validate_text(data: bytes) -> bool:
    try:
        text = data.decode("utf-8-sig")

        return (
            "\x00" not in text
            and all(
                len(line) <= MAX_TEXT_LINE_LENGTH
                for line in text.splitlines()
            )
        )

    except UnicodeDecodeError:
        return False


def validate_csv(data: bytes) -> bool:
    if not validate_text(data):
        return False

    try:
        text = data.decode("utf-8-sig")

        for _ in csv.reader(
            io.StringIO(text),
            strict=True,
        ):
            pass

        return True

    except csv.Error:
        return False


def contains_csv_formula_injection(data: bytes) -> bool:
    try:
        text = data.decode("utf-8-sig")

        if "\x00" in text:
            return True

        reader = csv.reader(
            io.StringIO(text),
            strict=True,
        )

        for row in reader:
            for value in row:
                value = value.lstrip(
                    "\ufeff\u200b\t\r\n "
                )

                if value.startswith(("=", "+", "-", "@")):
                    return True

        return False

    except (UnicodeDecodeError, csv.Error):
        return True


def validate_file_structure(
    extension: str,
    data: bytes,
) -> bool:
    validators = {
        ".pdf": validate_pdf,
        ".docx": validate_docx,
        ".xlsx": validate_xlsx,
        ".txt": validate_text,
        ".csv": validate_csv,
    }

    validator = validators.get(extension)

    return bool(
        validator and validator(data)
    )


def security_validate_uploaded_file(
    filename: str,
    extension: str,
    data: bytes,
    content_type: str | None = None,
) -> None:
    if not validate_filename(filename):
        raise HTTPException(
            status_code=400,
            detail="Invalid filename",
        )

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type",
        )

    allowed_mimes = {
        ".pdf": {
            "application/pdf",
        },
        ".docx": {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/zip",
        },
        ".xlsx": {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/zip",
        },
        ".txt": {
            "text/plain",
        },
        ".csv": {
            "text/csv",
            "application/csv",
            "application/vnd.ms-excel",
            "text/plain",
        },
    }

    if content_type:
        media_type = (
            content_type.split(";", 1)[0]
            .strip()
            .lower()
        )

        permitted = (
            allowed_mimes[extension]
            | {"application/octet-stream"}
        )

        if media_type not in permitted:
            raise HTTPException(
                status_code=400,
                detail="File MIME type does not match its extension",
            )

    if not data:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty",
        )

    if len(data) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Maximum file size is {MAX_FILE_SIZE_MB} MB",
        )

    if not validate_file_structure(extension, data):
        raise HTTPException(
            status_code=400,
            detail="Invalid file structure",
        )

    if (
        extension == ".pdf"
        and contains_pdf_active_content(data)
    ):
        raise HTTPException(
            status_code=400,
            detail="PDF contains unsupported active content",
        )

    if (
        extension in {".docx", ".xlsx"}
        and contains_unsafe_office_content(data)
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Office file contains unsupported "
                "active or embedded content"
            ),
        )

    if (
        extension == ".csv"
        and contains_csv_formula_injection(data)
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "CSV contains potentially unsafe "
                "spreadsheet formulas"
            ),
        )


async def process_uploaded_file(
    upload_file: UploadFile,
) -> dict:
    filename = upload_file.filename

    if not filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required",
        )

    extension = Path(filename).suffix.lower()

    try:
        data = await upload_file.read(
            MAX_FILE_SIZE_BYTES + 1
        )
    finally:
        await upload_file.close()

    security_validate_uploaded_file(
        filename=filename,
        extension=extension,
        data=data,
        content_type=upload_file.content_type,
    )

    file_hash = calculate_sha256(data)
    encrypted = get_fernet().encrypt(data)

    stored_path = (
        ORIGINAL_STORAGE
        / f"{uuid.uuid4().hex}.enc"
    )

    stored_path.write_bytes(encrypted)

    return {
        "original_filename": filename,
        "file_type": extension.lstrip("."),
        "file_size": len(data),
        "sha256_hash": file_hash,
        "encrypted_file_path": str(stored_path),
    }


def decrypt_and_verify_file(
    encrypted_file_path: str,
    expected_sha256: str,
) -> bytes:
    path = Path(encrypted_file_path)

    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail="Encrypted file not found",
        )

    try:
        data = get_fernet().decrypt(
            path.read_bytes()
        )

    except InvalidToken:
        raise HTTPException(
            status_code=409,
            detail="Encrypted file integrity check failed",
        )

    if calculate_sha256(data) != expected_sha256:
        raise HTTPException(
            status_code=409,
            detail="Document integrity verification failed",
        )

    return data


def inspect_original_integrity(
    encrypted_file_path: str,
    expected_sha256: str,
) -> dict:
    path = Path(encrypted_file_path)

    result = {
        "original_sha256": expected_sha256,
        "current_sha256": None,
        "integrity_status": "FAILED",
    }

    if not path.exists():
        return result

    try:
        data = get_fernet().decrypt(
            path.read_bytes()
        )

    except InvalidToken:
        return result

    result["current_sha256"] = calculate_sha256(data)

    result["integrity_status"] = (
        "VERIFIED"
        if result["current_sha256"] == expected_sha256
        else "FAILED"
    )

    return result


def retrieve_original_file(
    encrypted_file_path: str,
    expected_sha256: str,
) -> bytes:
    return decrypt_and_verify_file(
        encrypted_file_path,
        expected_sha256,
    )
