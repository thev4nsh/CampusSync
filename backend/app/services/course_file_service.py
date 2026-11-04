"""Validation and text extraction for private course-work attachments."""
from io import BytesIO
from pathlib import Path
import re
import zipfile
import xml.etree.ElementTree as ET
import html
from urllib.parse import parse_qs, urlparse

from fastapi import HTTPException

MAX_FILE_BYTES = 20 * 1024 * 1024
MAX_EXTRACTED_CHARS = 100_000
MAX_FILES_PER_POST = 5
SUPPORTED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
    ".txt", ".md", ".csv", ".rtf", ".srt", ".vtt", ".png", ".jpg", ".jpeg", ".webp",
}
OFFICE_DOCUMENT_PARTS = {
    ".docx": "word/document.xml",
    ".pptx": "ppt/presentation.xml",
    ".xlsx": "xl/workbook.xml",
}
OLE_SIGNATURE = bytes.fromhex("D0CF11E0A1B11AE1")
IMAGE_SIGNATURES = {
    ".png": b"\x89PNG\r\n\x1a\n",
    ".jpg": b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
}
CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".csv": "text/csv",
    ".rtf": "application/rtf",
    ".srt": "application/x-subrip",
    ".vtt": "text/vtt",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}


def _xml_text(data: bytes) -> str:
    root = ET.fromstring(data)
    return " ".join(text.strip() for text in root.itertext() if text and text.strip())


def _office_text(data: bytes, extension: str) -> str:
    try:
        with zipfile.ZipFile(BytesIO(data)) as archive:
            names = archive.namelist()
            if OFFICE_DOCUMENT_PARTS[extension] not in names:
                raise ValueError("Required document part is missing")
            selected = []
            if extension == ".docx":
                selected = ["word/document.xml"]
            elif extension == ".pptx":
                selected = sorted(
                    name for name in names
                    if re.fullmatch(r"ppt/slides/slide\d+\.xml", name)
                )
            else:
                shared = "xl/sharedStrings.xml"
                selected = ([shared] if shared in names else []) + sorted(
                    name for name in names
                    if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", name)
                )
            total_size = sum(archive.getinfo(name).file_size for name in selected)
            if total_size > 40 * 1024 * 1024:
                raise ValueError("Uncompressed document is too large")
            pieces = [_xml_text(archive.read(name)) for name in selected]
            return "\n".join(pieces)[:MAX_EXTRACTED_CHARS]
    except (zipfile.BadZipFile, KeyError, ET.ParseError, ValueError, OSError) as exc:
        raise HTTPException(status_code=415, detail="This Office document is invalid or cannot be read.") from exc


def normalize_youtube_url(value: str | None) -> str | None:
    """Validate and canonicalize a YouTube watch, short, embed, or youtu.be URL."""
    if value is None or not value.strip():
        return None
    parsed = urlparse(value.strip())
    host = (parsed.hostname or "").lower().rstrip(".")
    if parsed.scheme not in {"https", "http"} or parsed.username or parsed.password:
        raise ValueError("Use a valid YouTube video link.")
    if host == "youtu.be":
        video_id = parsed.path.strip("/").split("/")[0]
    elif host in {"youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"}:
        video_id = (parse_qs(parsed.query).get("v") or [""])[0]
        if not video_id:
            match = re.match(r"^/(?:shorts|embed|live)/([A-Za-z0-9_-]{11})(?:/|$)", parsed.path)
            video_id = match.group(1) if match else ""
    else:
        video_id = ""
    if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
        raise ValueError("Use a valid YouTube video link.")
    return f"https://www.youtube.com/watch?v={video_id}"


def _subtitle_text(data: bytes) -> str:
    try:
        raw = data.decode("utf-8-sig", errors="strict")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=415, detail="Subtitle captions must be UTF-8 encoded.") from exc
    lines = []
    for line in raw.splitlines():
        clean = line.strip()
        if (not clean or clean.upper().startswith("WEBVTT") or clean.startswith(("NOTE", "STYLE", "REGION"))
                or re.fullmatch(r"\d+", clean)
                or re.match(r"^(?:\d{2}:)?\d{2}:\d{2}[.,]\d{3}\s+-->", clean)
                or clean.startswith(("Kind:", "Language:"))):
            continue
        clean = re.sub(r"<[^>]*>", "", clean)
        clean = html.unescape(clean)
        if clean:
            lines.append(clean)
    return "\n".join(lines)[:MAX_EXTRACTED_CHARS].strip()


def validate_and_extract(filename: str, data: bytes) -> tuple[str, str, str]:
    """Return normalized name, MIME type, and extracted text (empty if not text-readable)."""
    safe_name = Path(filename.replace("\\", "/")).name[:255]
    extension = Path(safe_name).suffix.lower()
    if extension not in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Use PDF, Office, text, subtitle, RTF, or image files for course work.")
    if not data or len(data) > MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="Each course-work file must be smaller than 20 MB.")

    extracted = ""
    if extension == ".pdf":
        if not data.startswith(b"%PDF-"):
            raise HTTPException(status_code=415, detail="This PDF file is invalid.")
        try:
            from pypdf import PdfReader
            reader = PdfReader(BytesIO(data), strict=True)
            extracted = "\n".join(page.extract_text() or "" for page in reader.pages[:300])[:MAX_EXTRACTED_CHARS]
        except Exception as exc:
            raise HTTPException(status_code=415, detail="This PDF could not be read. Check that it is not damaged or password-protected.") from exc
    elif extension in OFFICE_DOCUMENT_PARTS:
        extracted = _office_text(data, extension)
    elif extension in {".doc", ".ppt", ".xls"}:
        if not data.startswith(OLE_SIGNATURE):
            raise HTTPException(status_code=415, detail="This Office file is invalid.")
    elif extension in {".txt", ".md", ".csv"}:
        try:
            extracted = data.decode("utf-8-sig", errors="strict")[:MAX_EXTRACTED_CHARS]
            if "\x00" in extracted:
                raise UnicodeDecodeError("utf-8", data, 0, 1, "NUL byte")
        except UnicodeDecodeError as exc:
            raise HTTPException(status_code=415, detail="Text files must be UTF-8 encoded.") from exc
    elif extension == ".rtf":
        if not data.lstrip().startswith(b"{\\rtf"):
            raise HTTPException(status_code=415, detail="This RTF file is invalid.")
        raw = data.decode("latin-1", errors="ignore")
        extracted = re.sub(r"\\'[0-9a-fA-F]{2}|\\[a-zA-Z]+-?\d* ?|[{}]", " ", raw)
        extracted = re.sub(r"\s+", " ", extracted)[:MAX_EXTRACTED_CHARS]
    elif extension in {".srt", ".vtt"}:
        extracted = _subtitle_text(data)
    elif extension in IMAGE_SIGNATURES:
        if not data.startswith(IMAGE_SIGNATURES[extension]):
            raise HTTPException(status_code=415, detail="This image file is invalid.")
    elif extension == ".webp":
        if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
            raise HTTPException(status_code=415, detail="This WebP image is invalid.")

    return safe_name, CONTENT_TYPES[extension], extracted.strip()
