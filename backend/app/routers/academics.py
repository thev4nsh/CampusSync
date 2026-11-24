"""Admin-managed academic structure: departments, batches and class assignments."""

import re
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_active_user, require_admin
from app.models import (
    Batch,
    Class,
    Department,
    Student,
    Subject,
    Teacher,
    TeacherSubjectAssignment,
    User,
)
from app.schemas import (
    BatchCreate,
    BatchResponse,
    BatchUpdate,
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
    TeacherAssignmentCreate,
    TeacherAssignmentResponse,
)
from app.services.academics_service import clean_text, department_code_from_name

router = APIRouter(prefix="/academics", tags=["Academic Structure"])


# ==============================================================================
# DEPARTMENTS
# ==============================================================================

@router.get("/departments", response_model=List[DepartmentResponse])
def list_departments(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Every admin-defined department. Readable by all signed-in users (dropdowns)."""
    rows = db.query(Department).order_by(Department.name.asc()).all()
    return [
        DepartmentResponse(
            id=row.id,
            code=row.code,
            name=row.name,
            created_at=row.created_at,
            batch_count=db.query(Batch).filter(Batch.department_id == row.id).count(),
        )
        for row in rows
    ]


@router.post("/departments", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    name = clean_text(payload.name)
    code = clean_text(payload.code).upper()
    if db.query(Department).filter(Department.code.ilike(code)).first():
        raise HTTPException(status_code=409, detail=f"Department code '{code}' already exists.")
    if db.query(Department).filter(Department.name.ilike(name)).first():
        raise HTTPException(status_code=409, detail=f"Department '{name}' already exists.")

    row = Department(code=code, name=name)
    db.add(row)
    db.commit()
    db.refresh(row)
    return DepartmentResponse(
        id=row.id, code=row.code, name=row.name, created_at=row.created_at, batch_count=0
    )


@router.put("/departments/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    payload: DepartmentUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Rename a department and carry the new name into every stored record."""
    row = db.query(Department).filter(Department.id == department_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Department not found.")

    old_name = row.name
    new_name = clean_text(payload.name) if payload.name is not None else None
    new_code = clean_text(payload.code).upper() if payload.code is not None else None

    if new_code and new_code != row.code:
        if db.query(Department).filter(Department.code.ilike(new_code), Department.id != row.id).first():
            raise HTTPException(status_code=409, detail=f"Department code '{new_code}' already in use.")
        row.code = new_code

    if new_name and new_name != old_name:
        if db.query(Department).filter(Department.name.ilike(new_name), Department.id != row.id).first():
            raise HTTPException(status_code=409, detail=f"Department '{new_name}' already exists.")
        row.name = new_name
        # Faculty who also teach in this department keep it in their extra list.
        for teacher in db.query(Teacher).filter(Teacher.extra_departments.isnot(None)).all():
            parts = [part.strip() for part in (teacher.extra_departments or "").split(",") if part.strip()]
            if any(part.lower() == old_name.lower() for part in parts):
                teacher.extra_departments = ", ".join(
                    new_name if part.lower() == old_name.lower() else part for part in parts
                ) or None
        # Free-text department columns follow the admin's rename.
        for model in (Class, Subject, Student, Teacher):
            db.query(model).filter(model.department.ilike(old_name)).update(
                {model.department: new_name}, synchronize_session=False
            )

    db.commit()
    db.refresh(row)
    return DepartmentResponse(
        id=row.id,
        code=row.code,
        name=row.name,
        created_at=row.created_at,
        batch_count=db.query(Batch).filter(Batch.department_id == row.id).count(),
    )


@router.delete("/departments/{department_id}")
def delete_department(
    department_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete an unused department. Refuses while records still reference it."""
    row = db.query(Department).filter(Department.id == department_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Department not found.")

    teaches_here = any(
        row.name.lower() in {part.strip().lower() for part in (teacher.extra_departments or "").split(",") if part.strip()}
        for teacher in db.query(Teacher).filter(Teacher.extra_departments.isnot(None)).all()
    )
    in_use = (
        db.query(Class.id).filter(Class.department.ilike(row.name)).first()
        or db.query(Subject.id).filter(Subject.department.ilike(row.name)).first()
        or db.query(Student.id).filter(Student.department.ilike(row.name)).first()
        or db.query(Teacher.id).filter(Teacher.department.ilike(row.name)).first()
        or db.query(Batch.id).filter(Batch.department_id == row.id).first()
        or teaches_here
    )
    if in_use:
        raise HTTPException(
            status_code=409,
            detail="This department is still used by classes, subjects, students, faculty or batches.",
        )

    name = row.name
    db.delete(row)
    db.commit()
    return {"message": f"Department '{name}' removed successfully."}


# ==============================================================================
# BATCHES
# ==============================================================================

def _batch_response(db: Session, row: Batch) -> BatchResponse:
    return BatchResponse(
        id=row.id,
        name=row.name,
        department_id=row.department_id,
        start_year=row.start_year,
        end_year=row.end_year,
        department_name=row.department_obj.name if row.department_obj else None,
        department_code=row.department_obj.code if row.department_obj else None,
        class_count=db.query(Class).filter(Class.batch_id == row.id).count(),
        created_at=row.created_at,
    )


@router.get("/batches", response_model=List[BatchResponse])
def list_batches(
    department_id: Optional[int] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(Batch)
    if department_id:
        query = query.filter(Batch.department_id == department_id)
    rows = query.order_by(Batch.name.desc()).all()
    return [_batch_response(db, row) for row in rows]


def _derive_years(name: str) -> tuple[int | None, int | None]:
    """'2024-2028' -> (2024, 2028); a lone year -> (year, None)."""
    found = [int(match) for match in re.findall(r"(?:19|20)\d{2}", name)]
    if len(found) >= 2:
        return min(found), max(found)
    return (found[0] if found else None), None


@router.post("/batches", response_model=BatchResponse, status_code=status.HTTP_201_CREATED)
def create_batch(
    payload: BatchCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    department = db.query(Department).filter(Department.id == payload.department_id).first()
    if not department:
        raise HTTPException(status_code=404, detail="Department not found.")

    name = clean_text(payload.name)
    if db.query(Batch).filter(Batch.department_id == department.id, Batch.name.ilike(name)).first():
        raise HTTPException(status_code=409, detail=f"Batch '{name}' already exists in this department.")

    start_year, end_year = _derive_years(name)
    row = Batch(
        name=name,
        department_id=department.id,
        start_year=payload.start_year if payload.start_year is not None else start_year,
        end_year=payload.end_year if payload.end_year is not None else end_year,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _batch_response(db, row)


@router.put("/batches/{batch_id}", response_model=BatchResponse)
def update_batch(
    batch_id: int,
    payload: BatchUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.query(Batch).filter(Batch.id == batch_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Batch not found.")

    if payload.department_id is not None and payload.department_id != row.department_id:
        department = db.query(Department).filter(Department.id == payload.department_id).first()
        if not department:
            raise HTTPException(status_code=404, detail="Department not found.")
        row.department_id = department.id

    if payload.name is not None:
        name = clean_text(payload.name)
        if db.query(Batch).filter(
            Batch.department_id == row.department_id, Batch.name.ilike(name), Batch.id != row.id
        ).first():
            raise HTTPException(status_code=409, detail=f"Batch '{name}' already exists in this department.")
        row.name = name
        start_year, end_year = _derive_years(name)
        if payload.start_year is None:
            row.start_year = start_year
        if payload.end_year is None:
            row.end_year = end_year

    if payload.start_year is not None:
        row.start_year = payload.start_year
    if payload.end_year is not None:
        row.end_year = payload.end_year

    db.commit()
    db.refresh(row)
    return _batch_response(db, row)


@router.delete("/batches/{batch_id}")
def delete_batch(
    batch_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.query(Batch).filter(Batch.id == batch_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Batch not found.")

    # Unlink classes and students first so no dangling batch references remain.
    db.query(Class).filter(Class.batch_id == row.id).update({Class.batch_id: None}, synchronize_session=False)
    db.query(Student).filter(Student.batch_id == row.id).update({Student.batch_id: None}, synchronize_session=False)
    name = row.name
    db.delete(row)
    db.commit()
    return {"message": f"Batch '{name}' removed successfully."}


# ==============================================================================
# TEACHER CLASS / SUBJECT ASSIGNMENTS
# ==============================================================================

def _assignment_response(row: TeacherSubjectAssignment) -> TeacherAssignmentResponse:
    return TeacherAssignmentResponse(
        id=row.id,
        teacher_id=row.teacher_id,
        teacher_name=row.teacher.name if row.teacher else None,
        class_id=row.class_id,
        class_name=row.class_obj.name if row.class_obj else None,
        subject_id=row.subject_id,
        subject_name=row.subject.name if row.subject else None,
        subject_code=row.subject.code if row.subject else None,
        created_at=row.created_at,
    )


@router.get("/assignments", response_model=List[TeacherAssignmentResponse])
def list_assignments(
    teacher_id: Optional[str] = Query(None),
    class_id: Optional[int] = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(TeacherSubjectAssignment)
    if teacher_id:
        query = query.filter(TeacherSubjectAssignment.teacher_id == teacher_id)
    if class_id:
        query = query.filter(TeacherSubjectAssignment.class_id == class_id)
    return [_assignment_response(row) for row in query.order_by(TeacherSubjectAssignment.id.asc()).all()]


@router.post("/assignments", response_model=List[TeacherAssignmentResponse], status_code=status.HTTP_201_CREATED)
def assign_teacher(
    payload: TeacherAssignmentCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Assign one teacher to a class for one or more subjects."""
    teacher = db.query(Teacher).filter(Teacher.id == payload.teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found.")
    target_class = db.query(Class).filter(Class.id == payload.class_id).first()
    if not target_class:
        raise HTTPException(status_code=404, detail="Class not found.")

    created: List[TeacherSubjectAssignment] = []
    for subject_id in dict.fromkeys(payload.subject_ids):
        subject = db.query(Subject).filter(Subject.id == subject_id).first()
        if not subject:
            raise HTTPException(status_code=404, detail=f"Subject {subject_id} not found.")
        existing = db.query(TeacherSubjectAssignment).filter(
            TeacherSubjectAssignment.teacher_id == teacher.id,
            TeacherSubjectAssignment.class_id == target_class.id,
            TeacherSubjectAssignment.subject_id == subject.id,
        ).first()
        if existing:
            created.append(existing)
            continue
        row = TeacherSubjectAssignment(
            teacher_id=teacher.id, class_id=target_class.id, subject_id=subject.id
        )
        db.add(row)
        created.append(row)

    db.commit()
    for row in created:
        db.refresh(row)
    return [_assignment_response(row) for row in created]


@router.delete("/assignments/{assignment_id}")
def delete_assignment(
    assignment_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.query(TeacherSubjectAssignment).filter(TeacherSubjectAssignment.id == assignment_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found.")
    db.delete(row)
    db.commit()
    return {"message": "Assignment removed successfully."}


@router.get("/code-suggestion")
def suggest_department_code(
    name: str = Query(..., min_length=2, max_length=120),
    current_user: User = Depends(require_admin),
):
    """Helper for the admin form: propose a short code from a department name."""
    return {"code": department_code_from_name(clean_text(name))}
