"""Course material storage, private attachments, and AI endpoints."""
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_active_user, get_current_teacher
from app.models import (
    CourseMaterial,
    CourseMaterialAttachment,
    Student,
    Teacher,
    TeacherSubjectAssignment,
    User,
    UserRole,
)
from app.schemas import (
    CourseCitation,
    CourseMaterialCreate,
    CourseMaterialDetailResponse,
    CourseMaterialResponse,
    CourseMaterialSummaryResponse,
    CourseMaterialUpdate,
    CourseQuestionRequest,
    CourseQuestionResponse,
)
from app.services.learning_ai_service import answer_from_material, ensure_ai_configured, summarize_material
from app.services.ai_usage_service import consume_ai_request, daily_limit_for, used_today
from app.services.course_file_service import MAX_FILES_PER_POST, MAX_FILE_BYTES, normalize_youtube_url, validate_and_extract

materials_router = APIRouter(prefix="/materials", tags=["Course Materials"])
ai_router = APIRouter(prefix="/ai", tags=["Course Material AI"])
COURSE_UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads" / "course_materials"


@ai_router.get("/status")
def get_ai_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    limit = daily_limit_for(current_user)
    return {
        "configured": bool(settings.OPENAI_API_KEY),
        "requests_used_today": used_today(db, current_user.id),
        "daily_request_limit": limit,
    }


def _teacher_for_user(db: Session, user: User) -> Teacher | None:
    return db.query(Teacher).filter(Teacher.user_id == user.id).first()


def _student_for_user(db: Session, user: User) -> Student | None:
    return db.query(Student).filter(Student.user_id == user.id).first()


def _teacher_has_assignment(db: Session, teacher_id: str, class_id: int, subject_id: int) -> bool:
    return db.query(TeacherSubjectAssignment.id).filter(
        TeacherSubjectAssignment.teacher_id == teacher_id,
        TeacherSubjectAssignment.class_id == class_id,
        TeacherSubjectAssignment.subject_id == subject_id,
    ).first() is not None


def _get_accessible_material(db: Session, material_id: str, user: User) -> CourseMaterial:
    material = db.query(CourseMaterial).filter(CourseMaterial.id == material_id).first()
    if not material:
        raise HTTPException(status_code=404, detail="Course material not found.")

    if user.role == UserRole.ADMIN:
        return material
    if user.role == UserRole.TEACHER:
        teacher = _teacher_for_user(db, user)
        if teacher and _teacher_has_assignment(
            db, teacher.id, material.class_id, material.subject_id
        ):
            return material
    elif user.role == UserRole.STUDENT:
        student = _student_for_user(db, user)
        if student and student.class_id == material.class_id:
            return material
    raise HTTPException(status_code=404, detail="Course material not found.")


@materials_router.post("", response_model=CourseMaterialResponse, status_code=status.HTTP_201_CREATED)
def create_course_material(
    payload: CourseMaterialCreate,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    assigned = _teacher_has_assignment(
        db, teacher.id, payload.class_id, payload.subject_id
    )
    if not assigned:
        raise HTTPException(
            status_code=403,
            detail="You are not assigned to teach this subject in this class.",
        )
    if len(payload.content.strip()) < 20 and not payload.source_url:
        raise HTTPException(status_code=422, detail="Add course notes or a YouTube video link.")

    material = CourseMaterial(
        id=str(uuid4()),
        title=payload.title.strip(),
        content=payload.content,
        content_type=payload.content_type,
        source_url=payload.source_url,
        class_id=payload.class_id,
        subject_id=payload.subject_id,
        teacher_id=teacher.id,
        version=1,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@materials_router.post("/upload", response_model=CourseMaterialResponse, status_code=status.HTTP_201_CREATED)
async def upload_course_material(
    title: str = Form(..., min_length=1, max_length=180),
    class_id: int = Form(...),
    subject_id: int = Form(...),
    content: str = Form("", max_length=100000),
    source_url: str | None = Form(None, max_length=500),
    files: list[UploadFile] = File(...),
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    """Publish a classwork post with multiple downloadable files and extractable AI notes."""
    if not files or len(files) > MAX_FILES_PER_POST:
        raise HTTPException(status_code=422, detail=f"Attach between 1 and {MAX_FILES_PER_POST} files.")
    if not _teacher_has_assignment(db, teacher.id, class_id, subject_id):
        raise HTTPException(status_code=403, detail="You are not assigned to teach this subject in this class.")
    try:
        source_url = normalize_youtube_url(source_url)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    material_id = str(uuid4())
    prepared: list[tuple[str, str, str, bytes, int]] = []
    extracted_parts = [content.strip()] if content.strip() else []
    for upload in files:
        data = await upload.read(MAX_FILE_BYTES + 1)
        if len(data) > MAX_FILE_BYTES:
            raise HTTPException(status_code=413, detail=f"{upload.filename or 'A file'} exceeds the 20 MB limit.")
        filename, content_type, extracted = validate_and_extract(upload.filename or "", data)
        prepared.append((filename, content_type, extracted, data, len(data)))
        if extracted:
            extracted_parts.append(f"Source file: {filename}\n{extracted}")
    extracted_content = "\n\n".join(extracted_parts)[:100000]
    stored_paths: list[Path] = []
    try:
        COURSE_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        material = CourseMaterial(
            id=material_id,
            title=title.strip(),
            content=extracted_content,
            content_type="text/markdown",
            source_url=source_url,
            class_id=class_id,
            subject_id=subject_id,
            teacher_id=teacher.id,
            version=1,
        )
        db.add(material)
        for filename, content_type, _extracted, data, size_bytes in prepared:
            attachment_id = str(uuid4())
            suffix = Path(filename).suffix.lower()
            target = COURSE_UPLOAD_DIR / f"{attachment_id}{suffix}"
            target.write_bytes(data)
            stored_paths.append(target)
            db.add(CourseMaterialAttachment(
                id=attachment_id,
                material_id=material_id,
                file_path=str(target),
                filename=filename,
                content_type=content_type,
                size_bytes=size_bytes,
            ))
        db.commit()
        db.refresh(material)
        return material
    except Exception:
        db.rollback()
        for path in stored_paths:
            path.unlink(missing_ok=True)
        raise


@materials_router.get("", response_model=list[CourseMaterialResponse])
def list_course_materials(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(CourseMaterial)
    if current_user.role == UserRole.ADMIN:
        return query.order_by(CourseMaterial.created_at.desc()).all()
    if current_user.role == UserRole.STUDENT:
        student = _student_for_user(db, current_user)
        if not student or not student.class_id:
            return []
        query = query.filter(CourseMaterial.class_id == student.class_id)
        return query.order_by(CourseMaterial.created_at.desc()).all()
    if current_user.role == UserRole.TEACHER:
        teacher = _teacher_for_user(db, current_user)
        if not teacher:
            return []
        assignments = db.query(TeacherSubjectAssignment.class_id, TeacherSubjectAssignment.subject_id).filter(
            TeacherSubjectAssignment.teacher_id == teacher.id
        ).all()
        allowed_pairs = {(class_id, subject_id) for class_id, subject_id in assignments}
        if not allowed_pairs:
            return []
        return [
            material for material in query.order_by(CourseMaterial.created_at.desc()).all()
            if (material.class_id, material.subject_id) in allowed_pairs
        ]
    raise HTTPException(status_code=403, detail="This account cannot access course materials.")


@materials_router.get("/{material_id}", response_model=CourseMaterialDetailResponse)
def get_course_material(
    material_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    return _get_accessible_material(db, material_id, current_user)


@materials_router.get("/{material_id}/attachments/{attachment_id}")
def download_course_material_attachment(
    material_id: str,
    attachment_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    material = _get_accessible_material(db, material_id, current_user)
    attachment = db.query(CourseMaterialAttachment).filter(
        CourseMaterialAttachment.id == attachment_id,
        CourseMaterialAttachment.material_id == material.id,
    ).first()
    if not attachment or not Path(attachment.file_path).is_file():
        raise HTTPException(status_code=404, detail="Course file not found.")
    return FileResponse(
        attachment.file_path,
        media_type=attachment.content_type,
        filename=attachment.filename,
        content_disposition_type="attachment",
        headers={"Cache-Control": "private, no-store"},
    )


@materials_router.put("/{material_id}", response_model=CourseMaterialResponse)
def update_course_material(
    material_id: str,
    payload: CourseMaterialUpdate,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
):
    material = db.query(CourseMaterial).filter(
        CourseMaterial.id == material_id,
        CourseMaterial.teacher_id == teacher.id,
    ).first()
    if not material:
        raise HTTPException(status_code=404, detail="Course material not found.")
    if not _teacher_has_assignment(
        db, teacher.id, material.class_id, material.subject_id
    ):
        raise HTTPException(status_code=403, detail="You are not assigned to this course.")

    material.title = payload.title.strip()
    material.content = payload.content
    material.content_type = payload.content_type
    material.version += 1
    material.summary = None
    material.summary_version = None
    db.commit()
    db.refresh(material)
    return material


@ai_router.post(
    "/materials/{material_id}/summary",
    response_model=CourseMaterialSummaryResponse,
)
def summarize_course_material(
    material_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    material = _get_accessible_material(db, material_id, current_user)
    if not material.ai_ready:
        raise HTTPException(status_code=422, detail="This post has no readable text for AI summarization yet. Try adding text-based files or notes.")
    if material.summary and material.summary_version == material.version:
        summary = material.summary
    else:
        ensure_ai_configured()
        consume_ai_request(db, current_user)
        summary = summarize_material(material.content)
        material.summary = summary
        material.summary_version = material.version
        db.commit()
    return CourseMaterialSummaryResponse(
        material_id=material.id,
        material_version=material.version,
        summary=summary,
    )


@ai_router.post(
    "/materials/{material_id}/questions",
    response_model=CourseQuestionResponse,
)
def ask_course_material(
    material_id: str,
    payload: CourseQuestionRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    material = _get_accessible_material(db, material_id, current_user)
    if not material.ai_ready:
        raise HTTPException(status_code=422, detail="This post has no readable text for AI questions yet. Try adding text-based files or notes.")
    ensure_ai_configured()
    consume_ai_request(db, current_user)
    answer, citations, abstained = answer_from_material(
        material.content, payload.question
    )
    return CourseQuestionResponse(
        material_id=material.id,
        material_version=material.version,
        answer=answer,
        citations=[CourseCitation(**citation) for citation in citations],
        abstained=abstained,
    )
