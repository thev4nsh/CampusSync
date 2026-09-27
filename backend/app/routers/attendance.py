from typing import List, Optional, Any
from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    AttendanceSession,
    AttendanceRecord,
    AttendanceMethod,
    AttendanceStatus,
    SessionStatus,
    Class,
    Subject,
    Teacher,
    Student,
    TeacherSubjectAssignment,
    User
)
from app.schemas import (
    AttendanceSessionCreate,
    AttendanceSessionResponse,
    AttendanceRecordResponse,
    ManualAttendanceRequest,
    RFIDAttendanceRequest,
    FingerprintAttendanceRequest,
    FaceAttendanceRequest,
    AttendanceSubmissionResponse
)
from app.services.attendance_service import attendance_service
from app.services.device_service import device_service
from app.dependencies import (
    get_current_active_user,
    require_teacher,
    require_admin
)

router = APIRouter(prefix="/attendance", tags=["Attendance"])


# ==============================================================================
# ATTENDANCE SESSION MANAGEMENT
# ==============================================================================

@router.post("/sessions", response_model=AttendanceSessionResponse, status_code=status.HTTP_201_CREATED)
@router.post("/session", response_model=AttendanceSessionResponse, status_code=status.HTTP_201_CREATED)
def start_attendance_session(
    data: AttendanceSessionCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Initialize an active attendance terminal session for a designated Class and Subject.
    Called by a faculty member before hardware or manual attendance marking begins.
    """
    # 1. Resolve Teacher
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher and current_user.role.value == "admin":
        teacher = db.query(Teacher).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faculty profile required to initiate an attendance session."
        )

    # 2. Resolve Class (by ID or Name)
    target_class = None
    try:
        numeric_class_id = int(data.class_id)
        target_class = db.query(Class).filter(Class.id == numeric_class_id).first()
    except (ValueError, TypeError):
        target_class = db.query(Class).filter(Class.name.ilike(str(data.class_id).strip())).first()

    if not target_class:
        # Create class if not found for initial setup ease
        target_class = Class(
            name=str(data.class_id).strip(),
            year="3rd Year",
            section="A",
            department=teacher.department
        )
        db.add(target_class)
        db.commit()
        db.refresh(target_class)

    # 3. Resolve Subject (by ID or Name)
    target_subject = None
    try:
        numeric_subject_id = int(data.subject_id)
        target_subject = db.query(Subject).filter(Subject.id == numeric_subject_id).first()
    except (ValueError, TypeError):
        target_subject = db.query(Subject).filter(Subject.name.ilike(str(data.subject_id).strip())).first()

    if not target_subject:
        target_subject = Subject(
            code=f"CS{uuid.uuid4().hex[:3].upper()}",
            name=str(data.subject_id).strip(),
            department=teacher.department
        )
        db.add(target_subject)
        db.commit()
        db.refresh(target_subject)

    # 4. Create Session Instance
    session_id = f"SES-{uuid.uuid4().hex[:6].upper()}"
    new_session = AttendanceSession(
        id=session_id,
        teacher_id=teacher.id,
        class_id=target_class.id,
        subject_id=target_subject.id,
        start_time=datetime.now(timezone.utc),
        status=SessionStatus.ACTIVE
    )

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return AttendanceSessionResponse(
        id=new_session.id,
        teacher_id=teacher.id,
        teacher_name=teacher.user.name,
        class_id=target_class.id,
        class_name=target_class.name,
        subject_id=target_subject.id,
        subject_name=target_subject.name,
        start_time=new_session.start_time,
        end_time=new_session.end_time,
        status=new_session.status,
        created_at=new_session.created_at
    )


@router.get("/sessions", response_model=List[AttendanceSessionResponse])
def list_attendance_sessions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List recent attendance sessions."""
    sessions = db.query(AttendanceSession).order_by(AttendanceSession.created_at.desc()).limit(50).all()
    return [
        AttendanceSessionResponse(
            id=s.id,
            teacher_id=s.teacher_id,
            teacher_name=s.teacher.user.name if s.teacher else None,
            class_id=s.class_id,
            class_name=s.class_obj.name,
            subject_id=s.subject_id,
            subject_name=s.subject.name,
            start_time=s.start_time,
            end_time=s.end_time,
            status=s.status,
            created_at=s.created_at
        )
        for s in sessions
    ]


@router.get("/sessions/{session_id}")
@router.get("/session/{session_id}")
def get_attendance_session_detail(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve details and statistics for a specific attendance session."""
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance session not found.")
    return session


@router.post("/sessions/{session_id}/close")
@router.post("/session/{session_id}/end")
def close_attendance_session(
    session_id: str,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """Close an active attendance session."""
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance session not found.")

    session.status = SessionStatus.CLOSED
    session.end_time = datetime.now(timezone.utc)
    db.commit()

    return {"message": f"Attendance session '{session_id}' has been closed.", "session_id": session_id}


@router.get("/sessions/{session_id}/live", response_model=List[AttendanceRecordResponse])
@router.get("/session/{session_id}/live", response_model=List[AttendanceRecordResponse])
def get_live_session_attendance(
    session_id: str,
    db: Session = Depends(get_db)
):
    """
    Fetch the live real-time stream of incoming attendance records for an active terminal session.
    """
    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id
    ).order_by(AttendanceRecord.timestamp.desc()).all()

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


# ==============================================================================
# ATTENDANCE INGEST CHANNELS (MANUAL, RFID, FINGERPRINT, FACE)
# ALL ROUTE THROUGH THE CENTRAL ATTENDANCE SERVICE
# ==============================================================================

@router.post("/manual", response_model=AttendanceSubmissionResponse)
def submit_manual_attendance(
    payload: ManualAttendanceRequest,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Submit batch manual attendance roster from faculty roll call.
    Automatically resolves/creates session and saves PRESENT, ABSENT, or LATE statuses.
    """
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher and current_user.role.value == "admin":
        teacher = db.query(Teacher).first()

    # 1. Resolve Class
    target_class = None
    if payload.class_id:
        clean_class = str(payload.class_id).strip()
        try:
            numeric_cid = int(clean_class)
            target_class = db.query(Class).filter(Class.id == numeric_cid).first()
        except (ValueError, TypeError):
            pass
        if not target_class:
            target_class = db.query(Class).filter(Class.name.ilike(clean_class)).first()

    if not target_class and payload.records:
        first_st = db.query(Student).filter(Student.id == payload.records[0].student_id).first()
        if first_st and first_st.class_id:
            target_class = db.query(Class).filter(Class.id == first_st.class_id).first()

    if not target_class:
        target_class = db.query(Class).first()

    # 2. Resolve Subject
    target_subject = None
    if payload.subject_id:
        clean_subj = str(payload.subject_id).strip()
        try:
            numeric_sid = int(clean_subj)
            target_subject = db.query(Subject).filter(Subject.id == numeric_sid).first()
        except (ValueError, TypeError):
            pass
        if not target_subject:
            target_subject = db.query(Subject).filter(
                (Subject.name.ilike(clean_subj)) | (Subject.code.ilike(clean_subj))
            ).first()

    if not target_subject and teacher:
        first_assignment = db.query(TeacherSubjectAssignment).filter(TeacherSubjectAssignment.teacher_id == teacher.id).first()
        if first_assignment:
            target_subject = first_assignment.subject

    if not target_subject:
        target_subject = db.query(Subject).first()

    # 3. Resolve or Create Session
    session = None
    if payload.session_id:
        session = db.query(AttendanceSession).filter(AttendanceSession.id == payload.session_id).first()

    if not session and target_class and target_subject and teacher:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        session = db.query(AttendanceSession).filter(
            AttendanceSession.class_id == target_class.id,
            AttendanceSession.subject_id == target_subject.id,
            AttendanceSession.created_at >= today_start
        ).order_by(AttendanceSession.created_at.desc()).first()

        if not session:
            session_id = f"SES-{uuid.uuid4().hex[:6].upper()}"
            session = AttendanceSession(
                id=session_id,
                teacher_id=teacher.id,
                class_id=target_class.id,
                subject_id=target_subject.id,
                start_time=datetime.now(timezone.utc),
                status=SessionStatus.ACTIVE
            )
            db.add(session)
            db.commit()
            db.refresh(session)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to initialize attendance session. Please ensure Class and Subject are selected."
        )

    # 4. Process Each Student Record
    created_count = 0
    updated_count = 0
    record_time = datetime.now(timezone.utc)

    for item in payload.records:
        if not item.student_id:
            continue
        student = db.query(Student).filter(Student.id == item.student_id).first()
        if not student:
            continue

        # Status mapping
        if isinstance(item.status, AttendanceStatus):
            status_val = item.status
        else:
            raw_s = str(item.status or "PRESENT").strip().upper()
            if raw_s in ["ABSENT", "AB"]:
                status_val = AttendanceStatus.ABSENT
            elif raw_s in ["LATE"]:
                status_val = AttendanceStatus.LATE
            else:
                status_val = AttendanceStatus.PRESENT

        existing = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == session.id,
            AttendanceRecord.student_id == student.id
        ).first()

        if existing:
            existing.status = status_val
            existing.method = AttendanceMethod.MANUAL
            existing.timestamp = record_time
            updated_count += 1
        else:
            record_id = f"REC-{uuid.uuid4().hex[:6].upper()}"
            new_record = AttendanceRecord(
                id=record_id,
                session_id=session.id,
                student_id=student.id,
                method=AttendanceMethod.MANUAL,
                status=status_val,
                timestamp=record_time
            )
            db.add(new_record)
            created_count += 1

    db.commit()

    return AttendanceSubmissionResponse(
        success=True,
        message=f"Manual attendance saved for {created_count + updated_count} students in {target_class.name if target_class else 'class'} for {target_subject.name if target_subject else 'subject'}."
    )


@router.post("/rfid", response_model=AttendanceSubmissionResponse)
def record_rfid_attendance(
    payload: RFIDAttendanceRequest,
    db: Session = Depends(get_db)
):
    """
    Direct hardware ingestion endpoint for physical 13.56 MHz RFID readers (ESP32/RC522).
    Maps RFID Card UID -> Student -> Active Attendance Session.
    """
    # 1. Update hardware terminal heartbeat
    device_service.update_device_heartbeat(db, payload.device_id)

    # 2. Resolve Student by Card UID
    student = device_service.resolve_student_by_rfid(db, payload.rfid_uid)

    # 3. Process through unified attendance service
    record, msg = attendance_service.process_attendance(
        db=db,
        student_id=student.id,
        method=AttendanceMethod.RFID,
        session_id=payload.session_id,
        device_id=payload.device_id,
        timestamp=payload.timestamp
    )

    return AttendanceSubmissionResponse(
        success=True,
        message=msg,
        student_name=student.user.name,
        student_id=student.id,
        status=record.status.value,
        method="RFID"
    )


@router.post("/fingerprint", response_model=AttendanceSubmissionResponse)
def record_fingerprint_attendance(
    payload: FingerprintAttendanceRequest,
    db: Session = Depends(get_db)
):
    """
    Direct hardware ingestion endpoint for physical biometric fingerprint terminals.
    Maps template index -> Student -> Active Attendance Session.
    """
    device_service.update_device_heartbeat(db, payload.device_id)
    student = device_service.resolve_student_by_fingerprint(db, payload.template_id)

    record, msg = attendance_service.process_attendance(
        db=db,
        student_id=student.id,
        method=AttendanceMethod.FINGERPRINT,
        session_id=payload.session_id,
        device_id=payload.device_id,
        timestamp=payload.timestamp
    )

    return AttendanceSubmissionResponse(
        success=True,
        message=msg,
        student_name=student.user.name,
        student_id=student.id,
        status=record.status.value,
        method="FINGERPRINT"
    )


@router.post("/face", response_model=AttendanceSubmissionResponse)
def record_face_attendance(
    payload: FaceAttendanceRequest,
    db: Session = Depends(get_db)
):
    """
    Direct endpoint for edge AI Face Recognition services stream.
    Receives recognized Student ID and logs verified attendance.
    """
    device_service.update_device_heartbeat(db, payload.device_id)

    record, msg = attendance_service.process_attendance(
        db=db,
        student_id=payload.student_id,
        method=AttendanceMethod.FACE,
        session_id=payload.session_id,
        device_id=payload.device_id,
        timestamp=payload.timestamp
    )

    return AttendanceSubmissionResponse(
        success=True,
        message=msg,
        student_name=record.student.user.name,
        student_id=record.student.id,
        status=record.status.value,
        method="FACE"
    )
