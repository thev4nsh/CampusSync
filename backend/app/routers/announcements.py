from pathlib import Path
from io import BytesIO
import zipfile
from datetime import date
from uuid import uuid4
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_active_user, get_current_teacher
from app.models import (
    Class,
    CourseAnnouncement,
    Student,
    Teacher,
    TeacherSubjectAssignment,
    User,
    UserRole,
)
from app.schemas import AnnouncementResponse

router = APIRouter(prefix="/announcements", tags=["Announcements"])
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "announcements"
MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024
MAX_POSTER_BYTES = 6 * 1024 * 1024
PDF_SIGNATURE = b"%PDF-"
OFFICE_ZIP_MEMBERS = {
    ".docx": "word/document.xml",
    ".pptx": "ppt/presentation.xml",
    ".xlsx": "xl/workbook.xml",
}
OLE_SIGNATURE = bytes.fromhex("D0CF11E0A1B11AE1")
TEXT_EXTENSIONS = {".txt", ".md", ".csv"}
DOCUMENT_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
    ".txt", ".md", ".csv", ".rtf",
}
POSTER_SIGNATURES = {
    ".png": b"\x89PNG\r\n\x1a\n",
    ".jpg": b"\xff\xd8\xff",
    ".jpeg": b"\xff\xd8\xff",
}


def _teacher_for_user(db: Session, user: User) -> Teacher | None:
    return db.query(Teacher).filter(Teacher.user_id == user.id).first()


def _filename(upload: UploadFile) -> str:
    return (upload.filename or "attachment").replace("\\", "/").split("/")[-1][:255]


async def _read_upload(upload: UploadFile | None, kind: str):
    if not upload:
        return None
    name = _filename(upload)
    suffix = Path(name).suffix.lower()
    limit = MAX_ATTACHMENT_BYTES if kind == "file" else MAX_POSTER_BYTES
    data = await upload.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status_code=413, detail=f"{kind.upper()} exceeds the {limit // (1024 * 1024)} MB limit.")

    if kind == "file":
        valid = False
        if suffix == ".pdf":
            valid = data.startswith(PDF_SIGNATURE)
        elif suffix in OFFICE_ZIP_MEMBERS:
            try:
                with zipfile.ZipFile(BytesIO(data)) as archive:
                    valid = OFFICE_ZIP_MEMBERS[suffix] in archive.namelist()
            except (zipfile.BadZipFile, OSError):
                valid = False
        elif suffix in {".doc", ".ppt", ".xls"}:
            valid = data.startswith(OLE_SIGNATURE)
        elif suffix in TEXT_EXTENSIONS:
            try:
                data.decode("utf-8-sig", errors="strict")
                valid = b"\x00" not in data
            except UnicodeDecodeError:
                valid = False
        elif suffix == ".rtf":
            valid = data.lstrip().startswith(b"{\\rtf")
        if suffix not in DOCUMENT_EXTENSIONS or not valid:
            raise HTTPException(status_code=415, detail="Choose a valid PDF, Word, PowerPoint, Excel, TXT, Markdown, CSV, or RTF file.")
    else:
        is_webp = suffix == ".webp" and data[:4] == b"RIFF" and data[8:12] == b"WEBP"
        is_known = suffix in POSTER_SIGNATURES and data.startswith(POSTER_SIGNATURES[suffix])
        if not (is_known or is_webp):
            raise HTTPException(status_code=415, detail="Poster must be a valid PNG, JPEG, or WebP image.")
    return data, name


def _validate_link(url: str | None) -> str | None:
    if not url or not url.strip():
        return None
    clean = url.strip()
    parsed = urlparse(clean)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.username or parsed.password:
        raise HTTPException(status_code=422, detail="Link must be a valid http or https URL.")
    return clean


def _can_access(db: Session, announcement: CourseAnnouncement, user: User) -> bool:
    if user.role == UserRole.ADMIN:
        return True
    if user.role == UserRole.STUDENT:
        student = db.query(Student).filter(Student.user_id == user.id).first()
        return bool(student and student.class_id == announcement.class_id)
    if user.role == UserRole.TEACHER:
        teacher = _teacher_for_user(db, user)
        if not teacher:
            return False
        assignment = db.query(TeacherSubjectAssignment.id).filter(
            TeacherSubjectAssignment.teacher_id == teacher.id,
            TeacherSubjectAssignment.class_id == announcement.class_id,
        )
        if announcement.subject_id is not None:
            assignment = assignment.filter(TeacherSubjectAssignment.subject_id == announcement.subject_id)
        return assignment.first() is not None
    return False


@router.get("", response_model=list[AnnouncementResponse])
def list_announcements(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(CourseAnnouncement)
    if current_user.role == UserRole.ADMIN:
        return query.order_by(CourseAnnouncement.created_at.desc()).all()
    if current_user.role == UserRole.STUDENT:
        student = db.query(Student).filter(Student.user_id == current_user.id).first()
        if not student or not student.class_id:
            return []
        return query.filter(CourseAnnouncement.class_id == student.class_id).order_by(CourseAnnouncement.created_at.desc()).all()
    if current_user.role == UserRole.TEACHER:
        teacher = _teacher_for_user(db, current_user)
        if not teacher:
            return []
        allowed = db.query(TeacherSubjectAssignment.class_id, TeacherSubjectAssignment.subject_id).filter(
            TeacherSubjectAssignment.teacher_id == teacher.id
        ).all()
        allowed_by_class: dict[int, set[int]] = {}
        for class_id, subject_id in allowed:
            allowed_by_class.setdefault(class_id, set()).add(subject_id)
        return [
            item for item in query.order_by(CourseAnnouncement.created_at.desc()).all()
            if item.class_id in allowed_by_class and (
                item.subject_id is None or item.subject_id in allowed_by_class[item.class_id]
            )
        ]
    return []


@router.get("/mine", response_model=list[AnnouncementResponse])
def list_my_announcements(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Return only announcements authored by this teacher for their sent-items dashboard."""
    return db.query(CourseAnnouncement).filter(
        CourseAnnouncement.teacher_id == teacher.id
    ).order_by(CourseAnnouncement.created_at.desc()).all()


@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    title: str = Form(..., min_length=1, max_length=180),
    message: str = Form(..., min_length=1, max_length=10000),
    class_id: int = Form(...),
    subject_id: int | None = Form(None),
    priority: str = Form("normal"),
    is_alert: bool = Form(False),
    link_url: str | None = Form(None),
    link_label: str | None = Form(None, max_length=120),
    event_date: date | None = Form(None),
    attachment: UploadFile | None = File(None),
    pdf: UploadFile | None = File(None),
    poster: UploadFile | None = File(None),
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    if priority not in {"normal", "important", "urgent"}:
        raise HTTPException(status_code=422, detail="Priority must be normal, important, or urgent.")
    if not db.query(Class.id).filter(Class.id == class_id).first():
        raise HTTPException(status_code=404, detail="Class not found.")
    assignment = db.query(TeacherSubjectAssignment.id).filter(
        TeacherSubjectAssignment.teacher_id == teacher.id,
        TeacherSubjectAssignment.class_id == class_id,
    )
    if subject_id is not None:
        assignment = assignment.filter(TeacherSubjectAssignment.subject_id == subject_id)
    if not assignment.first():
        raise HTTPException(status_code=403, detail="You are not assigned to this class and subject.")

    clean_link = _validate_link(link_url)
    if attachment and pdf:
        raise HTTPException(status_code=422, detail="Attach one course file at a time.")
    file_upload = attachment or pdf
    file_data = await _read_upload(file_upload, "file")
    poster_data = await _read_upload(poster, "poster")
    announcement_id = str(uuid4())
    stored_paths: list[Path] = []
    file_path = poster_path = None
    file_name = poster_name = None
    file_content_type = None
    try:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        if file_data:
            data, file_name = file_data
            suffix = Path(file_name).suffix.lower()
            target = UPLOAD_DIR / (announcement_id + suffix)
            target.write_bytes(data)
            stored_paths.append(target)
            file_path = str(target)
            file_content_type = {
                ".pdf": "application/pdf", ".doc": "application/msword",
                ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".ppt": "application/vnd.ms-powerpoint",
                ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                ".xls": "application/vnd.ms-excel",
                ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ".txt": "text/plain", ".md": "text/markdown", ".csv": "text/csv", ".rtf": "application/rtf",
            }[suffix]
        if poster_data:
            data, poster_name = poster_data
            ext = Path(poster_name).suffix.lower()
            target = UPLOAD_DIR / (announcement_id + ext)
            target.write_bytes(data)
            stored_paths.append(target)
            poster_path = str(target)

        row = CourseAnnouncement(
            id=announcement_id,
            title=title.strip(),
            message=message.strip(),
            class_id=class_id,
            subject_id=subject_id,
            teacher_id=teacher.id,
            priority=priority,
            is_alert=is_alert,
            link_url=clean_link,
            link_label=(link_label or "").strip() or None,
            event_date=event_date,
            file_path=file_path,
            file_name=file_name,
            file_content_type=file_content_type,
            poster_path=poster_path,
            poster_filename=poster_name,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row
    except Exception:
        db.rollback()
        for path in stored_paths:
            path.unlink(missing_ok=True)
        raise


@router.get("/{announcement_id}/attachments/{kind}")
def get_announcement_attachment(
    announcement_id: str,
    kind: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if kind not in {"file", "pdf", "poster"}:
        raise HTTPException(status_code=404, detail="Attachment not found.")
    row = db.query(CourseAnnouncement).filter(CourseAnnouncement.id == announcement_id).first()
    if not row or not _can_access(db, row, current_user):
        raise HTTPException(status_code=404, detail="Announcement not found.")
    if kind in {"file", "pdf"}:
        path_value = row.file_path or row.pdf_path
        filename = row.file_name or row.pdf_filename
    else:
        path_value = row.poster_path
        filename = row.poster_filename
    if not path_value or not Path(path_value).is_file():
        raise HTTPException(status_code=404, detail="Attachment not found.")
    if kind in {"file", "pdf"}:
        suffix = Path(filename or path_value).suffix.lower()
        media_type = row.file_content_type or {
            ".pdf": "application/pdf", ".doc": "application/msword",
            ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".ppt": "application/vnd.ms-powerpoint",
            ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".xls": "application/vnd.ms-excel",
            ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".txt": "text/plain", ".md": "text/markdown", ".csv": "text/csv", ".rtf": "application/rtf",
        }.get(suffix, "application/octet-stream")
    else:
        suffix = Path(filename or path_value).suffix.lower()
        media_type = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}.get(suffix)
        if not media_type:
            raise HTTPException(status_code=415, detail="Unsupported poster type.")
    return FileResponse(
        path_value,
        media_type=media_type,
        filename=filename,
        content_disposition_type="inline" if kind == "poster" else "attachment",
        headers={"Cache-Control": "private, no-store"},
    )
