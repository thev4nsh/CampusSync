from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
import json
from app.database import get_db
from app.models import (
    Student,
    Class,
    AttendanceRecord,
    AttendanceSession,
    Subject,
    TeacherSubjectAssignment,
    AttendanceStatus,
    BiometricIdentity,
)
from app.schemas import (
    StudentResponse,
    StudentDashboardResponse,
    AttendanceRecordResponse,
    SubjectBreakdownItem,
    BiometricsStatus,
    StudentClassroomResponse,
)
from app.dependencies import get_current_student
from app.services.attendance_service import attendance_percentage
from app.services.face_recognition_service import (
    FaceRecognitionError,
    face_recognition_service,
)

router = APIRouter(prefix="/students", tags=["Students"])


def _face_template_count(biometric: Optional[BiometricIdentity]) -> int:
    if not biometric or not biometric.face_templates_ciphertext:
        return 0
    try:
        values = json.loads(biometric.face_templates_ciphertext)
        return len(values) if isinstance(values, list) else 0
    except (TypeError, ValueError):
        return 0


@router.post("/me/face-enrollment/samples")
async def add_my_face_enrollment_sample(
    image: UploadFile = File(...),
    consent: bool = Form(False),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Opt-in self-enrollment; only an encrypted normalized template is retained."""
    raw = await image.read(2_000_001)
    if not raw or len(raw) > 2_000_000:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image must be under 2 MB.")

    biometric = student.biometric_identity
    if biometric is None:
        biometric = BiometricIdentity(student_id=student.id, institution_id=student.institution_id)
        db.add(biometric)
        db.flush()

    if not consent and biometric.face_consent_at is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Explicit face-template consent is required.")

    try:
        encrypted_template = face_recognition_service.encrypt_face_template(raw)
    except FaceRecognitionError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

    samples = _face_template_count(biometric)
    if samples >= 5:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This enrollment already has five samples. Re-enroll to replace it.")
    stored = json.loads(biometric.face_templates_ciphertext) if biometric.face_templates_ciphertext else []
    stored.append(encrypted_template)
    biometric.face_templates_ciphertext = json.dumps(stored)
    biometric.face_consent_at = biometric.face_consent_at or datetime.now(timezone.utc)
    biometric.face_enrolled = len(stored) >= 3
    biometric.face_reference_id = "campussync-lbph-v1" if biometric.face_enrolled else None
    db.commit()

    return {
        "face_enrolled": biometric.face_enrolled,
        "sample_count": len(stored),
        "required_samples": 3,
        "message": "Face sample encrypted and saved." if not biometric.face_enrolled else "Face enrollment is ready.",
    }


@router.get("/me/face-enrollment")
def get_my_face_enrollment_status(student: Student = Depends(get_current_student)):
    biometric = student.biometric_identity
    return {
        "face_enrolled": bool(biometric and biometric.face_enrolled),
        "consented": bool(biometric and biometric.face_consent_at),
        "sample_count": _face_template_count(biometric),
        "required_samples": 3,
    }


@router.delete("/me/face-enrollment")
def revoke_my_face_enrollment(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    biometric = student.biometric_identity
    if biometric:
        biometric.face_enrolled = False
        biometric.face_reference_id = None
        biometric.face_templates_ciphertext = None
        biometric.face_consent_at = None
        db.commit()
    return {"face_enrolled": False, "message": "Face templates and consent were removed."}


@router.get("/classrooms", response_model=List[StudentClassroomResponse])
def get_student_classrooms(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """Return the student's active class home and the subjects currently taught to it."""
    if not student.class_id:
        return []
    class_obj = db.query(Class).filter(Class.id == student.class_id).first()
    if not class_obj:
        return []
    subjects = db.query(Subject).join(TeacherSubjectAssignment).filter(
        TeacherSubjectAssignment.class_id == class_obj.id
    ).distinct().order_by(Subject.name).all()
    return [StudentClassroomResponse(
        id=class_obj.id,
        name=class_obj.name,
        year=class_obj.year,
        section=class_obj.section,
        department=class_obj.department,
        subjects=subjects,
    )]


@router.get("/me", response_model=StudentResponse)
def get_my_student_profile(
    student: Student = Depends(get_current_student)
):
    """
    Get the authenticated student's profile information and biometric enrollment status.
    """
    rfid_card = student.rfid_card
    biometric = student.biometric_identity

    return {
        "id": student.id,
        "name": student.user.name,
        "email": student.user.email,
        "department": student.department,
        "course": student.course,
        "year": student.year,
        "section": student.section,
        "class_id": student.class_id,
        "class_name": student.class_obj.name if student.class_obj else None,
        "batch_id": student.batch_id,
        "batch_name": student.batch_obj.name if student.batch_obj else None,
        "roll_number": student.roll_number,
        "phone": student.phone,
        "biometrics": {
            "fingerprint": bool(biometric and biometric.fingerprint_enrolled),
            "face": bool(biometric and biometric.face_enrolled),
            "face_enrollment_samples": _face_template_count(biometric),
            "rfid": bool(rfid_card and rfid_card.is_active),
            "rfid_uid": rfid_card.card_uid if rfid_card else None
        },
        "created_at": student.created_at
    }


@router.get("/profile", response_model=StudentResponse)
@router.get("/me/profile", response_model=StudentResponse)
def get_my_profile_alias(
    student: Student = Depends(get_current_student)
):
    """Alias for /students/me returning detailed profile."""
    return get_my_student_profile(student)


@router.get("/dashboard", response_model=StudentDashboardResponse)
@router.get("/me/dashboard", response_model=StudentDashboardResponse)
def get_student_dashboard(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Calculates and returns complete attendance analytics for the student:
    - Overall attendance percentage
    - Classes present and missed counts
    - Subject-by-subject attendance progress
    - Recent terminal activity logs
    """
    # 1. Fetch total attendance records for this student
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.student_id == student.id
    ).order_by(AttendanceRecord.timestamp.desc()).all()

    total_classes = len(records)
    present_classes = sum(
        1 for r in records if r.status in (AttendanceStatus.PRESENT, AttendanceStatus.LATE)
    )
    absent_classes = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)
    overall_attendance = attendance_percentage(records)

    # 2. Compute Subject-wise attendance breakdown
    subject_map = {}
    for r in records:
        subj = r.session.subject
        if subj.id not in subject_map:
            subject_map[subj.id] = {
                "code": subj.code,
                "subject_name": subj.name,
                "present": 0,
                "total": 0
            }
        subject_map[subj.id]["total"] += 1
        if r.status in [AttendanceStatus.PRESENT, AttendanceStatus.LATE]:
            subject_map[subj.id]["present"] += 1

    # Include all enrolled course subjects for the student's class
    if student.class_id:
        from app.models import TeacherSubjectAssignment
        class_assignments = db.query(TeacherSubjectAssignment).filter(
            TeacherSubjectAssignment.class_id == student.class_id
        ).all()
        for a in class_assignments:
            if a.subject and a.subject.id not in subject_map:
                subject_map[a.subject.id] = {
                    "code": a.subject.code,
                    "subject_name": a.subject.name,
                    "present": 0,
                    "total": 0
                }
    if not subject_map:
        for subj in db.query(Subject).all():
            if subj.id not in subject_map:
                subject_map[subj.id] = {
                    "code": subj.code,
                    "subject_name": subj.name,
                    "present": 0,
                    "total": 0
                }

    subject_breakdown = []
    for s_id, s_data in subject_map.items():
        pct = round((s_data["present"] / s_data["total"] * 100), 1) if s_data["total"] > 0 else 0.0
        subject_breakdown.append(SubjectBreakdownItem(
            code=s_data["code"],
            subject_name=s_data["subject_name"],
            present=s_data["present"],
            total=s_data["total"],
            percentage=pct
        ))

    # 3. Format Recent Records (last 10)
    recent_records = []
    for r in records[:10]:
        recent_records.append(AttendanceRecordResponse(
            id=r.id,
            student_id=r.student_id,
            student_name=student.user.name,
            class_name=r.session.class_obj.name if r.session.class_obj else None,
            subject=r.session.subject.name,
            date=r.timestamp.strftime("%d %b %Y"),
            time=r.timestamp.strftime("%I:%M %p"),
            method=r.method.value,
            status=r.status.value,
            created_at=r.created_at
        ))

    return {
        "overall_attendance": overall_attendance,
        "present_classes": present_classes,
        "absent_classes": absent_classes,
        "total_classes": total_classes,
        "subject_breakdown": subject_breakdown,
        "recent_records": recent_records
    }


@router.get("/attendance", response_model=List[AttendanceRecordResponse])
@router.get("/me/attendance", response_model=List[AttendanceRecordResponse])
def get_student_attendance_history(
    subject: Optional[str] = Query(None, description="Filter by subject title"),
    method: Optional[str] = Query(None, description="Filter by method (RFID, Fingerprint, etc)"),
    status: Optional[str] = Query(None, description="Filter by status (PRESENT, ABSENT)"),
    search: Optional[str] = Query(None, description="Search query across subject/date"),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Retrieve filterable attendance log history for the authenticated student.
    """
    query = db.query(AttendanceRecord).join(AttendanceSession).join(Subject).filter(
        AttendanceRecord.student_id == student.id
    )

    if subject and subject != "All":
        query = query.filter(Subject.name.ilike(f"%{subject}%"))

    if method and method != "All":
        query = query.filter(AttendanceRecord.method == method.upper())

    if status and status != "All":
        query = query.filter(AttendanceRecord.status == status.upper())

    if search:
        query = query.filter(Subject.name.ilike(f"%{search}%"))

    records = query.order_by(AttendanceRecord.timestamp.desc()).all()

    return [
        AttendanceRecordResponse(
            id=r.id,
            student_id=r.student_id,
            student_name=student.user.name,
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
