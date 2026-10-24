"""Course material storage and AI endpoints."""
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_active_user, get_current_teacher
from app.models import (
    CourseMaterial,
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
from app.services.learning_ai_service import answer_from_material, summarize_material

materials_router = APIRouter(prefix="/materials", tags=["Course Materials"])
ai_router = APIRouter(prefix="/ai", tags=["Course Material AI"])


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

    material = CourseMaterial(
        id=str(uuid4()),
        title=payload.title.strip(),
        content=payload.content,
        content_type=payload.content_type,
        class_id=payload.class_id,
        subject_id=payload.subject_id,
        teacher_id=teacher.id,
        version=1,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


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
    if material.summary and material.summary_version == material.version:
        summary = material.summary
    else:
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
