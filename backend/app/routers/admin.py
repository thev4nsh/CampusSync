from typing import List, Optional, Any
from datetime import datetime, timezone
from pathlib import Path
import uuid
from fastapi import APIRouter, Depends, File, Query, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    User,
    UserRole,
    Student,
    Teacher,
    Class,
    Subject,
    TeacherSubjectAssignment,
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
    AttendanceMethod,
    Device,
    RFIDCard,
    BiometricIdentity,
    SystemSetting,
    SessionStatus,
    AuthSession,
    Batch,
    Department,
)
from app.schemas import (
    AdminDashboardResponse,
    StudentCreate,
    StudentUpdate,
    StudentResponse,
    TeacherCreate,
    TeacherUpdate,
    TeacherResponse,
    ClassCreate,
    ClassUpdate,
    ClassResponse,
    SubjectCreate,
    SubjectUpdate,
    SubjectResponse,
    AttendanceRecordResponse,
    AttendanceRecordCreateAdmin,
    AttendanceRecordUpdateAdmin,
    SystemSettingsResponse,
    SystemSettingsUpdate,
    DeviceResponse
)
from app.security import get_password_hash
from app.dependencies import require_admin
from app.services.attendance_service import attendance_percentage
from app.services.academics_service import (
    BRANDING_DIR,
    LOGO_EXTENSIONS,
    MAX_LOGO_BYTES,
    logo_url,
    resolve_batch,
    find_class_for_student,
    resolve_department,
)

router = APIRouter(prefix="/admin", tags=["Admin"])


# ==============================================================================
# ADMIN DASHBOARD
# ==============================================================================

@router.get("/dashboard", response_model=AdminDashboardResponse)
def get_admin_dashboard(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Retrieve campus-wide executive overview statistics for university administrators.
    """
    total_students = db.query(Student).count()
    total_teachers = db.query(Teacher).count()
    total_classes = db.query(Class).count()
    active_devices = db.query(Device).filter(Device.is_active.is_(True)).count()

    records = db.query(AttendanceRecord).all()
    total_records = len(records)
    overall_attendance = attendance_percentage(records)

    # Method distribution breakdown
    rfid_count = sum(1 for r in records if r.method == AttendanceMethod.RFID)
    face_count = sum(1 for r in records if r.method == AttendanceMethod.FACE)
    fingerprint_count = sum(1 for r in records if r.method == AttendanceMethod.FINGERPRINT)
    manual_count = sum(1 for r in records if r.method == AttendanceMethod.MANUAL)

    return AdminDashboardResponse(
        total_students=total_students,
        total_teachers=total_teachers,
        total_classes=total_classes,
        overall_attendance=overall_attendance,
        active_devices=active_devices,
        method_breakdown={
            "rfid": f"{round(rfid_count / total_records * 100, 1)}%" if total_records > 0 else "0%",
            "rfid_pct": round(rfid_count / total_records * 100, 1) if total_records > 0 else 0,
            "face": f"{round(face_count / total_records * 100, 1)}%" if total_records > 0 else "0%",
            "face_pct": round(face_count / total_records * 100, 1) if total_records > 0 else 0,
            "fingerprint": f"{round(fingerprint_count / total_records * 100, 1)}%" if total_records > 0 else "0%",
            "fingerprint_pct": round(fingerprint_count / total_records * 100, 1) if total_records > 0 else 0,
            "manual": f"{round(manual_count / total_records * 100, 1)}%" if total_records > 0 else "0%",
            "manual_pct": round(manual_count / total_records * 100, 1) if total_records > 0 else 0,
        }
    )


# ==============================================================================
# STUDENTS CRUD
# ==============================================================================

@router.get("/students", response_model=List[StudentResponse])
def list_students(
    search: Optional[str] = Query(None),
    class_id: Optional[int] = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List and search enrolled students."""
    query = db.query(Student).join(User)

    if search:
        query = query.filter(
            (Student.id.ilike(f"%{search}%")) |
            (User.name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )

    if class_id:
        query = query.filter(Student.class_id == class_id)

    students = query.order_by(Student.id.asc()).all()
    results = []
    for s in students:
        att_pct = attendance_percentage(s.attendance_records)

        results.append(StudentResponse(
            id=s.id,
            name=s.user.name,
            email=s.user.email,
            department=s.department,
            course=s.course,
            year=s.year,
            section=s.section,
            class_id=s.class_id,
            class_name=s.class_obj.name if s.class_obj else None,
            batch_id=s.batch_id,
            batch_name=s.batch_obj.name if s.batch_obj else None,
            roll_number=s.roll_number,
            phone=s.phone,
            attendance_percentage=att_pct,
            created_at=s.created_at
        ))
    return results


@router.post("/students", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Enroll a new student with user credentials and biometric initialization."""
    student_id = payload.id.strip().upper()

    # Check for existing email or student ID
    if db.query(User).filter(User.email.ilike(payload.email.strip())).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.")
    if db.query(Student).filter(Student.id == student_id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Student ID is already registered.")

    # 1. Resolve Class
    target_class_id = payload.class_id
    if not target_class_id and payload.class_name:
        cls = db.query(Class).filter(Class.name.ilike(payload.class_name.strip())).first()
        if cls:
            target_class_id = cls.id
    if target_class_id and not db.query(Class.id).filter(Class.id == target_class_id).first():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found in this institution.")

    # 1b. Resolve the admin-defined department and batch the student belongs to.
    department = resolve_department(db, payload.department, required=True)
    batch = resolve_batch(db, payload.batch_id, department=department)

    # 1c. A student with a batch/section but no explicit class still joins its section class.
    if not target_class_id:
        matched_class = find_class_for_student(
            db, batch=batch, section=payload.section, department=department.name
        )
        if matched_class:
            target_class_id = matched_class.id

    # 2. Create User Record
    user = User(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        hashed_password=get_password_hash(payload.password),
        role=UserRole.STUDENT,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 3. Create Student Profile
    student = Student(
        id=student_id,
        user_id=user.id,
        class_id=target_class_id,
        batch_id=batch.id if batch else None,
        department=department.name,
        course=payload.course,
        year=batch.name if batch else payload.year,
        section=payload.section,
        roll_number=payload.roll_number,
        phone=payload.phone
    )
    db.add(student)

    # 4. Initialize default RFID Card & Biometric records
    rfid_card = RFIDCard(
        card_uid=f"RFID-{student_id}",
        student_id=student_id,
        is_active=True
    )
    db.add(rfid_card)

    bio = BiometricIdentity(
        student_id=student_id,
        fingerprint_enrolled=False,
        face_enrolled=False
    )
    db.add(bio)

    db.commit()
    db.refresh(student)

    return StudentResponse(
        id=student.id,
        name=user.name,
        email=user.email,
        department=student.department,
        course=student.course,
        year=student.year,
        section=student.section,
        class_id=student.class_id,
        class_name=student.class_obj.name if student.class_obj else None,
        batch_id=student.batch_id,
        batch_name=student.batch_obj.name if student.batch_obj else None,
        roll_number=student.roll_number,
        phone=student.phone,
        attendance_percentage=0.0,
        created_at=student.created_at
    )


@router.put("/students/{student_id}", response_model=StudentResponse)
def update_student(
    student_id: str,
    payload: StudentUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update student profile details and login credentials."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    user = student.user
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    if payload.email and payload.email.strip().lower() != user.email:
        existing = db.query(User).filter(User.email.ilike(payload.email.strip())).first()
        if existing and existing.id != user.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already used by another user.")
        user.email = payload.email.strip().lower()

    if payload.name:
        user.name = payload.name.strip()

    if payload.password:
        user.hashed_password = get_password_hash(payload.password)
        db.query(AuthSession).filter(
            AuthSession.user_id == user.id,
            AuthSession.revoked_at.is_(None),
        ).update({AuthSession.revoked_at: datetime.now(timezone.utc)}, synchronize_session=False)

    if payload.department:
        student.department = resolve_department(db, payload.department).name
    if "batch_id" in payload.model_fields_set:
        if payload.batch_id is None:
            student.batch_id = None
        else:
            batch = resolve_batch(
                db, payload.batch_id, department=resolve_department(db, student.department)
            )
            student.batch_id = batch.id
    if payload.course:
        student.course = payload.course
    if payload.year:
        student.year = payload.year
    if payload.section:
        student.section = payload.section
    if payload.roll_number is not None:
        student.roll_number = payload.roll_number.strip() or None
    if payload.phone is not None:
        student.phone = payload.phone

    if "class_id" in payload.model_fields_set:
        # An explicit null unassigns the student; a value must be a real class.
        if payload.class_id is None:
            student.class_id = None
        else:
            if not db.query(Class.id).filter(Class.id == payload.class_id).first():
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found in this institution.")
            student.class_id = payload.class_id
    elif payload.class_name:
        cls = db.query(Class).filter(Class.name.ilike(payload.class_name.strip())).first()
        if cls:
            student.class_id = cls.id

    if student.class_id is None:
        matched_class = find_class_for_student(
            db,
            batch=student.batch_obj,
            section=student.section,
            department=student.department,
        )
        if matched_class:
            student.class_id = matched_class.id

    db.commit()
    db.refresh(user)
    db.refresh(student)

    att_pct = attendance_percentage(student.attendance_records)

    return StudentResponse(
        id=student.id,
        name=user.name,
        email=user.email,
        department=student.department,
        course=student.course,
        year=student.year,
        section=student.section,
        class_id=student.class_id,
        class_name=student.class_obj.name if student.class_obj else None,
        batch_id=student.batch_id,
        batch_name=student.batch_obj.name if student.batch_obj else None,
        roll_number=student.roll_number,
        phone=student.phone,
        attendance_percentage=att_pct,
        created_at=student.created_at
    )


@router.delete("/students/{student_id}")
def delete_student(
    student_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a student record and linked user account."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found.")

    user = student.user
    db.delete(student)
    if user:
        db.delete(user)
    db.commit()

    return {"message": f"Student '{student_id}' removed successfully."}


# ==============================================================================
# TEACHERS CRUD
# ==============================================================================

def _assign_teacher_subjects(db: Session, teacher_id: str, subjects_list: List[str]):
    """Assign subjects to teacher across classes with strict foreign key integrity."""
    db.query(TeacherSubjectAssignment).filter(TeacherSubjectAssignment.teacher_id == teacher_id).delete()
    
    classes = db.query(Class).all()
    if not classes:
        default_cls = Class(name="CSE-3A", year="3rd Year", section="A", department="Computer Science & Engineering")
        db.add(default_cls)
        db.commit()
        db.refresh(default_cls)
        classes = [default_cls]

    assigned_subject_ids = set()
    for item in subjects_list:
        clean_name = str(item).strip()
        if not clean_name:
            continue
        
        subj = None
        try:
            numeric_id = int(clean_name)
            subj = db.query(Subject).filter(Subject.id == numeric_id).first()
        except (ValueError, TypeError):
            pass

        if not subj:
            subj = db.query(Subject).filter(
                (Subject.code.ilike(clean_name)) | (Subject.name.ilike(clean_name))
            ).first()

        if not subj:
            subj = db.query(Subject).filter(
                (Subject.code.ilike(f"%{clean_name}%")) | (Subject.name.ilike(f"%{clean_name}%"))
            ).first()

        if not subj:
            code_candidate = clean_name[:6].upper().replace(" ", "")
            subj = Subject(
                code=code_candidate if len(code_candidate) >= 3 else f"SUB{abs(hash(clean_name)) % 1000:03d}",
                name=clean_name,
                department="Computer Science & Engineering"
            )
            db.add(subj)
            db.commit()
            db.refresh(subj)

        if subj and subj.id not in assigned_subject_ids:
            assigned_subject_ids.add(subj.id)
            for cls in classes:
                existing = db.query(TeacherSubjectAssignment).filter(
                    TeacherSubjectAssignment.teacher_id == teacher_id,
                    TeacherSubjectAssignment.subject_id == subj.id,
                    TeacherSubjectAssignment.class_id == cls.id
                ).first()
                if not existing:
                    db.add(TeacherSubjectAssignment(
                        teacher_id=teacher_id,
                        subject_id=subj.id,
                        class_id=cls.id
                    ))
    db.commit()


def _resolve_teacher_departments(
    db: Session, departments: Optional[List[str]], fallback: Optional[str] = None
) -> tuple[str, Optional[str]]:
    """Resolve the primary department and the extra departments a faculty member works in."""
    names: List[str] = []
    for value in departments or ([fallback] if fallback else []):
        if not value or not str(value).strip():
            continue
        name = resolve_department(db, str(value).strip(), required=True).name
        if name.lower() not in {item.lower() for item in names}:
            names.append(name)
    if not names:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Choose at least one department for the faculty member.",
        )
    return names[0], (", ".join(names[1:]) or None)


@router.get("/teachers", response_model=List[TeacherResponse])
def list_teachers(
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all faculty members with assigned subject titles."""
    query = db.query(Teacher).join(User)
    if search:
        query = query.filter(
            (Teacher.id.ilike(f"%{search}%")) |
            (User.name.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%"))
        )

    teachers = query.order_by(Teacher.id.asc()).all()
    results = []
    for t in teachers:
        subjs = []
        seen = set()
        for a in t.subject_assignments:
            if a.subject and a.subject.id not in seen:
                seen.add(a.subject.id)
                subjs.append(a.subject.name)
        results.append(TeacherResponse(
            id=t.id,
            name=t.user.name,
            email=t.user.email,
            department=t.department,
            departments=t.department_list,
            phone=t.phone,
            subjects=subjs,
            created_at=t.created_at
        ))
    return results


@router.post("/teachers", response_model=TeacherResponse, status_code=status.HTTP_201_CREATED)
def create_teacher(
    payload: TeacherCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Register a new faculty instructor and map subject allocations."""
    teacher_id = payload.id.strip().upper()

    if db.query(User).filter(User.email.ilike(payload.email.strip())).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered.")
    if db.query(Teacher).filter(Teacher.id == teacher_id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Teacher ID already exists.")

    user = User(
        name=payload.name.strip(),
        email=payload.email.strip().lower(),
        hashed_password=get_password_hash(payload.password),
        role=UserRole.TEACHER,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    primary_department, extra_departments = _resolve_teacher_departments(
        db, payload.departments, payload.department
    )
    teacher = Teacher(
        id=teacher_id,
        user_id=user.id,
        department=primary_department,
        extra_departments=extra_departments,
        phone=payload.phone
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)

    if payload.subjects:
        _assign_teacher_subjects(db, teacher.id, payload.subjects)
        db.refresh(teacher)

    assigned_subjects = []
    seen = set()
    for a in teacher.subject_assignments:
        if a.subject and a.subject.id not in seen:
            seen.add(a.subject.id)
            assigned_subjects.append(a.subject.name)

    return TeacherResponse(
        id=teacher.id,
        name=user.name,
        email=user.email,
        department=teacher.department,
        departments=teacher.department_list,
        phone=teacher.phone,
        subjects=assigned_subjects,
        created_at=teacher.created_at
    )


@router.put("/teachers/{teacher_id}", response_model=TeacherResponse)
def update_teacher(
    teacher_id: str,
    payload: TeacherUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update faculty instructor details, login credentials, and subject assignments."""
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found.")

    user = teacher.user
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")

    if payload.email and payload.email.strip().lower() != user.email:
        existing = db.query(User).filter(User.email.ilike(payload.email.strip())).first()
        if existing and existing.id != user.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already used by another user.")
        user.email = payload.email.strip().lower()

    if payload.name:
        user.name = payload.name.strip()

    if payload.password:
        user.hashed_password = get_password_hash(payload.password)
        db.query(AuthSession).filter(
            AuthSession.user_id == user.id,
            AuthSession.revoked_at.is_(None),
        ).update({AuthSession.revoked_at: datetime.now(timezone.utc)}, synchronize_session=False)

    if payload.departments is not None or payload.department:
        primary_department, extra_departments = _resolve_teacher_departments(
            db, payload.departments, payload.department
        )
        teacher.department = primary_department
        teacher.extra_departments = extra_departments
    if payload.phone is not None:
        teacher.phone = payload.phone

    db.commit()
    db.refresh(user)
    db.refresh(teacher)

    if payload.subjects is not None:
        _assign_teacher_subjects(db, teacher.id, payload.subjects)
        db.refresh(teacher)

    assigned_subjects = []
    seen = set()
    for a in teacher.subject_assignments:
        if a.subject and a.subject.id not in seen:
            seen.add(a.subject.id)
            assigned_subjects.append(a.subject.name)

    return TeacherResponse(
        id=teacher.id,
        name=user.name,
        email=user.email,
        department=teacher.department,
        departments=teacher.department_list,
        phone=teacher.phone,
        subjects=assigned_subjects,
        created_at=teacher.created_at
    )


@router.delete("/teachers/{teacher_id}")
def delete_teacher(
    teacher_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a faculty member and clean up dependencies."""
    teacher = db.query(Teacher).filter(Teacher.id == teacher_id).first()
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found.")

    # 1. Delete teacher subject assignments
    db.query(TeacherSubjectAssignment).filter(TeacherSubjectAssignment.teacher_id == teacher.id).delete(synchronize_session=False)

    # 2. Clean up sessions & records for this teacher
    sessions = db.query(AttendanceSession).filter(AttendanceSession.teacher_id == teacher.id).all()
    for sess in sessions:
        db.query(AttendanceRecord).filter(AttendanceRecord.session_id == sess.id).delete(synchronize_session=False)
        db.delete(sess)

    user = teacher.user
    db.delete(teacher)
    if user:
        db.delete(user)
    db.commit()

    return {"message": f"Teacher '{teacher_id}' removed successfully."}


# ==============================================================================
# CLASSES CRUD
# ==============================================================================

@router.get("/classes", response_model=List[ClassResponse])
def list_classes(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all academic classes and student enrollment counts."""
    classes = db.query(Class).all()
    results = []
    for c in classes:
        st_count = db.query(Student).filter(Student.class_id == c.id).count()
        results.append(ClassResponse(
            id=c.id,
            name=c.name,
            year=c.year,
            section=c.section,
            department=c.department,
            batch_id=c.batch_id,
            batch_name=c.batch_name,
            created_at=c.created_at,
            total_students=st_count
        ))
    return results


@router.post("/classes", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
def create_class(
    payload: ClassCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new academic class section."""
    existing = db.query(Class).filter(Class.name.ilike(payload.name.strip())).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Class section name already exists.")

    department = resolve_department(db, payload.department, required=True)
    batch = resolve_batch(db, payload.batch_id, department=department)

    new_class = Class(
        name=payload.name.strip(),
        year=batch.name if batch else payload.year,
        section=(payload.section or "").strip()[:10],
        department=department.name,
        batch_id=batch.id if batch else None,
    )
    db.add(new_class)
    db.commit()
    db.refresh(new_class)

    return ClassResponse(
        id=new_class.id,
        name=new_class.name,
        year=new_class.year,
        section=new_class.section,
        department=new_class.department,
        batch_id=new_class.batch_id,
        batch_name=new_class.batch_name,
        created_at=new_class.created_at,
        total_students=0
    )


@router.put("/classes/{class_id}", response_model=ClassResponse)
def update_class(
    class_id: int,
    payload: ClassUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update class section details."""
    cls = db.query(Class).filter(Class.id == class_id).first()
    if not cls:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")

    if payload.name:
        existing = db.query(Class).filter(Class.name.ilike(payload.name.strip()), Class.id != class_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Class name already in use.")
        cls.name = payload.name.strip()

    if payload.year:
        cls.year = payload.year
    if payload.section is not None:
        cls.section = payload.section.strip()[:10]
    if payload.department:
        cls.department = resolve_department(db, payload.department).name

    if "batch_id" in payload.model_fields_set:
        if payload.batch_id is None:
            cls.batch_id = None
        else:
            batch = resolve_batch(
                db, payload.batch_id, department=resolve_department(db, cls.department)
            )
            cls.batch_id = batch.id
            cls.year = batch.name

    db.commit()
    db.refresh(cls)

    st_count = db.query(Student).filter(Student.class_id == cls.id).count()
    return ClassResponse(
        id=cls.id,
        name=cls.name,
        year=cls.year,
        section=cls.section,
        department=cls.department,
        batch_id=cls.batch_id,
        batch_name=cls.batch_name,
        created_at=cls.created_at,
        total_students=st_count
    )


@router.delete("/classes/{class_id}")
def delete_class(
    class_id: Any,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a class section and safely clean up / disassociate references."""
    target_class = None
    try:
        numeric_id = int(class_id)
        target_class = db.query(Class).filter(Class.id == numeric_id).first()
    except (ValueError, TypeError):
        pass

    if not target_class:
        target_class = db.query(Class).filter(Class.name.ilike(str(class_id).strip())).first()

    if not target_class:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")

    # 1. Disassociate students from this class
    students = db.query(Student).filter(Student.class_id == target_class.id).all()
    for st in students:
        st.class_id = None

    # 2. Delete teacher assignments for this class
    db.query(TeacherSubjectAssignment).filter(TeacherSubjectAssignment.class_id == target_class.id).delete(synchronize_session=False)

    # 3. Clean up attendance sessions & records for this class
    sessions = db.query(AttendanceSession).filter(AttendanceSession.class_id == target_class.id).all()
    for sess in sessions:
        db.query(AttendanceRecord).filter(AttendanceRecord.session_id == sess.id).delete(synchronize_session=False)
        db.delete(sess)

    class_name = target_class.name
    db.delete(target_class)
    db.commit()

    return {"message": f"Class '{class_name}' removed successfully."}


# ==============================================================================
# SUBJECTS CRUD
# ==============================================================================

@router.get("/subjects", response_model=List[SubjectResponse])
def list_subjects(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all course subjects."""
    return db.query(Subject).all()


@router.post("/subjects", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(
    payload: SubjectCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new course subject."""
    existing = db.query(Subject).filter(Subject.code.ilike(payload.code.strip())).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Subject code already exists.")

    new_subject = Subject(
        code=payload.code.strip().upper(),
        name=payload.name.strip(),
        department=resolve_department(db, payload.department, required=True).name
    )
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)

    return new_subject


@router.put("/subjects/{subject_id}", response_model=SubjectResponse)
def update_subject(
    subject_id: int,
    payload: SubjectUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update subject course details."""
    subj = db.query(Subject).filter(Subject.id == subject_id).first()
    if not subj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")

    if payload.code:
        existing = db.query(Subject).filter(Subject.code.ilike(payload.code.strip()), Subject.id != subject_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Subject code already in use.")
        subj.code = payload.code.strip().upper()

    if payload.name:
        subj.name = payload.name.strip()
    if payload.department:
        subj.department = resolve_department(db, payload.department).name

    db.commit()
    db.refresh(subj)
    return subj


@router.delete("/subjects/{subject_id}")
def delete_subject(
    subject_id: Any,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete a subject and safely clean up references."""
    target_subject = None
    try:
        numeric_id = int(subject_id)
        target_subject = db.query(Subject).filter(Subject.id == numeric_id).first()
    except (ValueError, TypeError):
        pass

    if not target_subject:
        target_subject = db.query(Subject).filter(
            (Subject.code.ilike(str(subject_id).strip())) | (Subject.name.ilike(str(subject_id).strip()))
        ).first()

    if not target_subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")

    # 1. Delete teacher subject assignments
    db.query(TeacherSubjectAssignment).filter(TeacherSubjectAssignment.subject_id == target_subject.id).delete(synchronize_session=False)

    # 2. Clean up attendance sessions & records for this subject
    sessions = db.query(AttendanceSession).filter(AttendanceSession.subject_id == target_subject.id).all()
    for sess in sessions:
        db.query(AttendanceRecord).filter(AttendanceRecord.session_id == sess.id).delete(synchronize_session=False)
        db.delete(sess)

    subj_name = target_subject.name
    db.delete(target_subject)
    db.commit()

    return {"message": f"Subject '{subj_name}' removed successfully."}


# ==============================================================================
# MASTER ATTENDANCE LOGS & CRUD
# ==============================================================================

@router.get("/attendance", response_model=List[AttendanceRecordResponse])
def get_all_attendance_logs(
    class_name: Optional[str] = Query(None),
    method: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Query campus-wide attendance logs with administrative filtering."""
    query = db.query(AttendanceRecord).join(AttendanceSession).join(Subject).join(Student)

    if class_name and class_name != "All":
        query = query.join(Class, AttendanceSession.class_id == Class.id).filter(Class.name.ilike(f"%{class_name}%"))

    if method and method != "All":
        query = query.filter(AttendanceRecord.method == method.upper())

    if status_filter and status_filter != "All":
        query = query.filter(AttendanceRecord.status == status_filter.upper())

    records = query.order_by(AttendanceRecord.timestamp.desc()).limit(150).all()

    return [
        AttendanceRecordResponse(
            id=r.id,
            student_id=r.student_id,
            student_name=r.student.user.name,
            class_name=r.session.class_obj.name if r.session.class_obj else None,
            subject=r.session.subject.name,
            date=r.timestamp.strftime("%d %b %Y"),
            time=r.timestamp.strftime("%I:%M %p"),
            method=r.method.value,
            status=r.status.value,
            created_at=r.created_at
        )
        for r in records
    ]


@router.post("/attendance", response_model=AttendanceRecordResponse, status_code=status.HTTP_201_CREATED)
def create_attendance_record_admin(
    payload: AttendanceRecordCreateAdmin,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create or manually insert an attendance record directly from the admin console."""
    student = db.query(Student).filter(Student.id.ilike(payload.student_id.strip())).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Student ID '{payload.student_id}' not found.")

    target_class_id = student.class_id
    if payload.class_id:
        try:
            target_class_id = int(payload.class_id)
        except (ValueError, TypeError):
            pass
    elif payload.class_name:
        cls = db.query(Class).filter(Class.name.ilike(payload.class_name.strip())).first()
        if cls:
            target_class_id = cls.id

    if not target_class_id:
        first_cls = db.query(Class).first()
        if first_cls:
            target_class_id = first_cls.id
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No classes exist. Please create a class first.")

    target_subject_id = None
    if payload.subject_id:
        try:
            target_subject_id = int(payload.subject_id)
        except (ValueError, TypeError):
            pass
    elif payload.subject_name:
        subj = db.query(Subject).filter(Subject.name.ilike(payload.subject_name.strip())).first()
        if subj:
            target_subject_id = subj.id

    if not target_subject_id:
        first_subj = db.query(Subject).first()
        if first_subj:
            target_subject_id = first_subj.id
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No subjects exist. Please create a subject first.")

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    session = db.query(AttendanceSession).filter(
        AttendanceSession.class_id == target_class_id,
        AttendanceSession.subject_id == target_subject_id,
        AttendanceSession.created_at >= today_start
    ).first()

    if not session:
        teacher = db.query(Teacher).first()
        teacher_id = teacher.id if teacher else "ADMIN"

        session = AttendanceSession(
            id=f"SES-{uuid.uuid4().hex[:8].upper()}",
            teacher_id=teacher_id,
            class_id=target_class_id,
            subject_id=target_subject_id,
            status=SessionStatus.CLOSED
        )
        db.add(session)
        db.commit()
        db.refresh(session)

    existing_rec = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == student.id,
        AttendanceRecord.session_id == session.id
    ).first()

    if existing_rec:
        existing_rec.status = payload.status
        existing_rec.method = payload.method
        db.commit()
        db.refresh(existing_rec)
        rec = existing_rec
    else:
        rec = AttendanceRecord(
            id=f"ATT-{uuid.uuid4().hex[:8].upper()}",
            student_id=student.id,
            session_id=session.id,
            method=payload.method,
            status=payload.status
        )
        db.add(rec)
        db.commit()
        db.refresh(rec)

    return AttendanceRecordResponse(
        id=rec.id,
        student_id=rec.student_id,
        student_name=rec.student.user.name,
        class_name=rec.session.class_obj.name if rec.session.class_obj else None,
        subject=rec.session.subject.name,
        date=rec.timestamp.strftime("%d %b %Y"),
        time=rec.timestamp.strftime("%I:%M %p"),
        method=rec.method.value,
        status=rec.status.value,
        created_at=rec.created_at
    )


@router.put("/attendance/{record_id}", response_model=AttendanceRecordResponse)
def update_attendance_record_admin(
    record_id: str,
    payload: AttendanceRecordUpdateAdmin,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update status or method of an existing attendance record."""
    rec = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found.")

    if payload.status:
        rec.status = payload.status
    if payload.method:
        rec.method = payload.method

    db.commit()
    db.refresh(rec)

    return AttendanceRecordResponse(
        id=rec.id,
        student_id=rec.student_id,
        student_name=rec.student.user.name,
        class_name=rec.session.class_obj.name if rec.session.class_obj else None,
        subject=rec.session.subject.name,
        date=rec.timestamp.strftime("%d %b %Y"),
        time=rec.timestamp.strftime("%I:%M %p"),
        method=rec.method.value,
        status=rec.status.value,
        created_at=rec.created_at
    )


@router.delete("/attendance/{record_id}")
def delete_attendance_record_admin(
    record_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Delete an attendance record from the database."""
    rec = db.query(AttendanceRecord).filter(AttendanceRecord.id == record_id).first()
    if not rec:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance record not found.")

    db.delete(rec)
    db.commit()
    return {"message": f"Attendance record '{record_id}' deleted successfully."}


# ==============================================================================
# SYSTEM SETTINGS & MULTI-INSTITUTION BRANDING
# ==============================================================================

def _read_system_settings(db: Session) -> SystemSettingsResponse:
    """Build the institutional settings payload from stored key/value rows."""
    settings = db.query(SystemSetting).all()
    setting_map = {s.key: s.value for s in settings}

    return SystemSettingsResponse(
        college_name=setting_map.get("college_name", "CampusSync University"),
        college_short_name=setting_map.get("college_short_name", "CampusSync"),
        academic_term=setting_map.get("academic_term", "Academic Session 2026"),
        min_attendance_pct=int(setting_map.get("min_attendance_pct", "75")),
        late_threshold_minutes=int(setting_map.get("late_threshold_minutes", "15")),
        session_timeout_minutes=int(setting_map.get("session_timeout_minutes", "60")),
        dual_factor_required=setting_map.get("dual_factor_required", "true").lower() == "true",
        support_email=setting_map.get("support_email", "admin@campussync.edu"),
        system_tagline=setting_map.get("system_tagline", "Smart Multi-Modal Attendance & Campus Management System"),
        logo_url=logo_url(),
    )


@router.get("/settings", response_model=SystemSettingsResponse)
def get_system_settings(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Retrieve institutional attendance policy and branding for administrators."""
    return _read_system_settings(db)


@router.get("/settings/public", response_model=SystemSettingsResponse)
def get_public_system_settings(db: Session = Depends(get_db)):
    """Public read-only branding used by the sign-in screen."""
    return _read_system_settings(db)


@router.put("/settings", response_model=SystemSettingsResponse)
def update_system_settings(
    payload: SystemSettingsUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update institutional attendance policies, college name, and system branding."""
    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        val_str = str(value)
        existing = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if existing:
            existing.value = val_str
        else:
            db.add(SystemSetting(key=key, value=val_str))

    db.commit()
    return _read_system_settings(db)


@router.post("/settings/logo", response_model=SystemSettingsResponse)
async def upload_institution_logo(
    logo: UploadFile = File(...),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Upload the institution logo shown on every dashboard and profile."""
    suffix = Path((logo.filename or "").replace("\\", "/").split("/")[-1]).suffix.lower()
    if suffix not in LOGO_EXTENSIONS:
        raise HTTPException(status_code=415, detail="Logo must be a PNG, JPEG, or WebP image.")

    data = await logo.read(MAX_LOGO_BYTES + 1)
    if len(data) > MAX_LOGO_BYTES:
        raise HTTPException(status_code=413, detail="Logo must be smaller than 3 MB.")

    is_webp = suffix == ".webp" and data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    is_known = (
        (suffix == ".png" and data.startswith(b"\x89PNG\r\n\x1a\n"))
        or (suffix in {".jpg", ".jpeg"} and data.startswith(b"\xff\xd8\xff"))
    )
    if not (is_known or is_webp):
        raise HTTPException(status_code=415, detail="That file is not a valid PNG, JPEG, or WebP image.")

    BRANDING_DIR.mkdir(parents=True, exist_ok=True)
    for existing in BRANDING_DIR.glob("logo.*"):
        existing.unlink(missing_ok=True)
    (BRANDING_DIR / f"logo{suffix}").write_bytes(data)

    return _read_system_settings(db)


@router.delete("/settings/logo", response_model=SystemSettingsResponse)
def delete_institution_logo(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Remove the uploaded logo and fall back to the default mark."""
    for existing in BRANDING_DIR.glob("logo.*"):
        existing.unlink(missing_ok=True)
    return _read_system_settings(db)


# ==============================================================================
# DATABASE MANAGEMENT & HEALTH
# ==============================================================================

@router.get("/database/summary")
def get_database_summary(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Return live record counts across all core database entities."""
    return {
        "students_count": db.query(Student).count(),
        "teachers_count": db.query(Teacher).count(),
        "classes_count": db.query(Class).count(),
        "subjects_count": db.query(Subject).count(),
        "attendance_records_count": db.query(AttendanceRecord).count(),
        "attendance_sessions_count": db.query(AttendanceSession).count(),
        "users_count": db.query(User).count(),
    }


@router.post("/database/clear-attendance")
def clear_all_attendance_records(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Clear all attendance records and sessions for a fresh semester or academic cycle."""
    rec_count = db.query(AttendanceRecord).count()
    ses_count = db.query(AttendanceSession).count()
    
    db.query(AttendanceRecord).delete(synchronize_session=False)
    db.query(AttendanceSession).delete(synchronize_session=False)
    db.commit()

    return {
        "success": True,
        "message": f"Successfully wiped {rec_count} attendance records and {ses_count} sessions."
    }
