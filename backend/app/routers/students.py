from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import (
    Student,
    AttendanceRecord,
    AttendanceSession,
    Subject,
    AttendanceStatus
)
from app.schemas import (
    StudentResponse,
    StudentDashboardResponse,
    AttendanceRecordResponse,
    SubjectBreakdownItem,
    BiometricsStatus
)
from app.dependencies import get_current_student

router = APIRouter(prefix="/students", tags=["Students"])


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
        "phone": student.phone,
        "biometrics": {
            "fingerprint": bool(biometric and biometric.fingerprint_enrolled),
            "face": bool(biometric and biometric.face_enrolled),
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
    present_classes = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
    absent_classes = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)
    overall_attendance = round((present_classes / total_classes * 100), 1) if total_classes > 0 else 0.0

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
