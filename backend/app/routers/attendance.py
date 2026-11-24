from typing import List, Optional, Any
from datetime import date, datetime, timedelta, timezone
import uuid
import zlib
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
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
    User,
    UserRole,
    Device,
    DeviceType
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
)
from app.dependencies import get_authenticated_device

router = APIRouter(prefix="/attendance", tags=["Attendance"])


# ==============================================================================
# SHARED HELPERS
# ==============================================================================

def _session_time(date_value: Optional[str]) -> datetime:
    """
    Build the timestamp for an attendance session or record.

    Teachers can back-fill a roll call, so an explicit ``date`` (YYYY-MM-DD) is
    honoured instead of always stamping "now". The clock time still comes from
    the current moment so ordering inside a day stays sensible.
    """
    now = datetime.now(timezone.utc)
    if date_value is None or str(date_value).strip() == "":
        return now
    try:
        parsed = date.fromisoformat(str(date_value).strip())
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Use a valid attendance date in YYYY-MM-DD format.",
        ) from exc
    return datetime(
        parsed.year, parsed.month, parsed.day,
        now.hour, now.minute, now.second, tzinfo=timezone.utc
    )


def _day_bounds(moment: datetime) -> tuple[datetime, datetime]:
    """Return the [start, end) UTC bounds of the day containing ``moment``."""
    start = moment.replace(hour=0, minute=0, second=0, microsecond=0)
    return start, start + timedelta(days=1)


def _resolve_class(db: Session, value: Any) -> Optional[Class]:
    """Resolve a class by exact numeric ID or exact name. Never guesses."""
    if value is None:
        return None
    clean = str(value).strip()
    if not clean:
        return None
    try:
        return db.query(Class).filter(Class.id == int(clean)).first()
    except (TypeError, ValueError):
        return db.query(Class).filter(Class.name.ilike(clean)).first()


def _resolve_subject(db: Session, value: Any) -> Optional[Subject]:
    """Resolve a subject by exact numeric ID, exact code, or exact name."""
    if value is None:
        return None
    clean = str(value).strip()
    if not clean:
        return None
    try:
        return db.query(Subject).filter(Subject.id == int(clean)).first()
    except (TypeError, ValueError):
        return db.query(Subject).filter(
            (Subject.name.ilike(clean)) | (Subject.code.ilike(clean))
        ).first()


def _is_numeric(value: Any) -> bool:
    """True when the caller passed an ID rather than a free-text name."""
    try:
        int(str(value).strip())
        return True
    except (TypeError, ValueError):
        return False


def _resolve_or_create_class(db: Session, value: Any, department: str) -> Class:
    """An ID must exist; a new name is created once, deterministically."""
    clean = str(value or "").strip()
    if not clean:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Select the class for this attendance session.",
        )
    existing = _resolve_class(db, clean)
    if existing:
        return existing
    if _is_numeric(clean):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found.")

    created = Class(
        name=clean,
        year="3rd Year",
        section="A",
        department=department or "General",
    )
    db.add(created)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return _resolve_class(db, clean)
    db.refresh(created)
    return created


def _resolve_or_create_subject(db: Session, value: Any, department: str) -> Subject:
    """An ID must exist; a new name gets a stable code instead of a random one."""
    clean = str(value or "").strip()
    if not clean:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Select the subject for this attendance session.",
        )
    existing = _resolve_subject(db, clean)
    if existing:
        return existing
    if _is_numeric(clean):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subject not found.")

    created = Subject(
        code=f"SUB{zlib.crc32(clean.casefold().encode('utf-8')) % 100000:05d}",
        name=clean,
        department=department or "General",
    )
    db.add(created)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return _resolve_subject(db, clean)
    db.refresh(created)
    return created


def _can_view_session(db: Session, session: AttendanceSession, user: User) -> bool:
    """Admins see everything; teachers and students only their own classes."""
    if user.role == UserRole.ADMIN:
        return True
    if user.role == UserRole.TEACHER:
        teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
        if not teacher:
            return False
        if session.teacher_id == teacher.id:
            return True
        return db.query(TeacherSubjectAssignment.id).filter(
            TeacherSubjectAssignment.teacher_id == teacher.id,
            TeacherSubjectAssignment.class_id == session.class_id,
        ).first() is not None
    student = db.query(Student).filter(Student.user_id == user.id).first()
    return bool(student and student.class_id == session.class_id)


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
    if not teacher and current_user.role == UserRole.ADMIN:
        teacher = db.query(Teacher).first()

    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Faculty profile required to initiate an attendance session."
        )

    # 2. Resolve Class (by ID, or by name with a single deterministic creation)
    target_class = _resolve_or_create_class(db, data.class_id, teacher.department)

    # 3. Resolve Subject (by ID/code/name, with a stable code when created)
    target_subject = _resolve_or_create_subject(db, data.subject_id, teacher.department)

    # 4. Create Session Instance (honouring an explicit back-fill date)
    session_id = f"SES-{uuid.uuid4().hex[:6].upper()}"
    new_session = AttendanceSession(
        id=session_id,
        teacher_id=teacher.id,
        class_id=target_class.id,
        subject_id=target_subject.id,
        start_time=_session_time(data.date),
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
    """List recent attendance sessions the caller is allowed to see."""
    query = db.query(AttendanceSession)
    if current_user.role != UserRole.ADMIN:
        visible_ids = []
        if current_user.role == UserRole.TEACHER:
            teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
            if not teacher:
                return []
            visible_ids = [
                a.class_id for a in teacher.subject_assignments
                if a.class_id is not None
            ]
        else:
            student = db.query(Student).filter(Student.user_id == current_user.id).first()
            if not student or not student.class_id:
                return []
            visible_ids = [student.class_id]
        query = query.filter(AttendanceSession.class_id.in_(visible_ids))

    sessions = query.order_by(AttendanceSession.created_at.desc()).limit(50).all()
    return [
        AttendanceSessionResponse(
            id=s.id,
            teacher_id=s.teacher_id,
            teacher_name=s.teacher.user.name if s.teacher else None,
            class_id=s.class_id,
            class_name=s.class_obj.name if s.class_obj else "",
            subject_id=s.subject_id,
            subject_name=s.subject.name if s.subject else "",
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
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Retrieve details and statistics for a specific attendance session."""
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance session not found.")
    if not _can_view_session(db, session, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view this attendance session.")

    return {
        "id": session.id,
        "teacher_id": session.teacher_id,
        "teacher_name": session.teacher.user.name if session.teacher and session.teacher.user else None,
        "class_id": session.class_id,
        "class_name": session.class_obj.name if session.class_obj else None,
        "subject_id": session.subject_id,
        "subject_name": session.subject.name if session.subject else None,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "status": session.status,
        "total_records": db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == session.id
        ).count(),
    }


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
    if not _can_view_session(db, session, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot close this attendance session.")

    session.status = SessionStatus.CLOSED
    session.end_time = datetime.now(timezone.utc)
    db.commit()

    return {"message": f"Attendance session '{session_id}' has been closed.", "session_id": session_id}


@router.get("/sessions/{session_id}/live", response_model=List[AttendanceRecordResponse])
@router.get("/session/{session_id}/live", response_model=List[AttendanceRecordResponse])
def get_live_session_attendance(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Fetch the live real-time stream of incoming attendance records for an active terminal session.
    """
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendance session not found.")
    if not _can_view_session(db, session, current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot view this attendance session.")

    records = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id == session_id
    ).order_by(AttendanceRecord.timestamp.desc()).all()

    return [
        AttendanceRecordResponse(
            id=r.id,
            student_id=r.student_id,
            student_name=r.student.user.name if r.student and r.student.user else r.student_id,
            class_name=r.session.class_obj.name if r.session and r.session.class_obj else None,
            subject=r.session.subject.name if r.session and r.session.subject else "",
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
    Automatically resolves/creates the session and saves PRESENT, ABSENT, or LATE statuses.
    """
    teacher = db.query(Teacher).filter(Teacher.user_id == current_user.id).first()
    if not teacher and current_user.role == UserRole.ADMIN:
        teacher = db.query(Teacher).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Faculty profile required to save attendance."
        )

    # 1. Resolve Class (given class, else the first student's own class)
    class_value = payload.class_id
    if class_value in (None, "") and payload.records:
        first_student = db.query(Student).filter(Student.id == payload.records[0].student_id).first()
        if first_student and first_student.class_id:
            class_value = first_student.class_id
    target_class = _resolve_or_create_class(db, class_value, teacher.department)

    # 2. Resolve Subject
    target_subject = _resolve_or_create_subject(db, payload.subject_id, teacher.department)

    # 3. Resolve or create the session for the requested day
    record_time = _session_time(payload.date)
    session = None
    if payload.session_id:
        session = db.query(AttendanceSession).filter(
            AttendanceSession.id == payload.session_id,
            AttendanceSession.teacher_id == teacher.id,
        ).first()
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attendance session not found for this faculty account."
            )

    if not session:
        day_start, day_end = _day_bounds(record_time)
        session = db.query(AttendanceSession).filter(
            AttendanceSession.teacher_id == teacher.id,
            AttendanceSession.class_id == target_class.id,
            AttendanceSession.subject_id == target_subject.id,
            AttendanceSession.start_time >= day_start,
            AttendanceSession.start_time < day_end,
        ).order_by(AttendanceSession.start_time.desc()).first()

        if not session:
            session = AttendanceSession(
                id=f"SES-{uuid.uuid4().hex[:6].upper()}",
                teacher_id=teacher.id,
                class_id=target_class.id,
                subject_id=target_subject.id,
                start_time=record_time,
                status=SessionStatus.ACTIVE
            )
            db.add(session)
            db.commit()
            db.refresh(session)

    # 4. Process Each Student Record
    created_count = 0
    updated_count = 0

    for item in payload.records:
        if not item.student_id:
            continue
        student = db.query(Student).filter(Student.id == item.student_id).first()
        if not student:
            continue
        if student.class_id != session.class_id:
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
        message=(
            f"Manual attendance saved for {created_count + updated_count} students in "
            f"{target_class.name} for {target_subject.name}."
        )
    )


@router.post("/rfid", response_model=AttendanceSubmissionResponse)
def record_rfid_attendance(
    payload: RFIDAttendanceRequest,
    device: Device = Depends(get_authenticated_device),
    db: Session = Depends(get_db)
):
    """
    Direct hardware ingestion endpoint for physical 13.56 MHz RFID readers (ESP32/RC522).
    Maps RFID Card UID -> Student -> Active Attendance Session.
    """
    _verify_ingest_device(device, payload.device_id, DeviceType.RFID)
    device_service.update_device_heartbeat(db, device.id)

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
    device: Device = Depends(get_authenticated_device),
    db: Session = Depends(get_db)
):
    """
    Direct hardware ingestion endpoint for physical biometric fingerprint terminals.
    Maps template index -> Student -> Active Attendance Session.
    """
    _verify_ingest_device(device, payload.device_id, DeviceType.FINGERPRINT)
    device_service.update_device_heartbeat(db, device.id)
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
    device: Device = Depends(get_authenticated_device),
    db: Session = Depends(get_db)
):
    """
    Direct endpoint for edge AI Face Recognition services stream.
    Receives recognized Student ID and logs verified attendance.
    """
    _verify_ingest_device(device, payload.device_id, DeviceType.FACE_CAMERA)
    device_service.update_device_heartbeat(db, device.id)

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


def _verify_ingest_device(device: Device, submitted_device_id: str, expected_type: DeviceType) -> None:
    """Ensure the body cannot impersonate another device or attendance modality."""
    if submitted_device_id != device.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Device ID does not match authenticated device.")
    if device.type != expected_type:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Device type cannot submit this attendance method.")
