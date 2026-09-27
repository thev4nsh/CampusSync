from datetime import datetime, timezone
from typing import Optional, Tuple
import uuid
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.models import (
    AttendanceRecord,
    AttendanceSession,
    Student,
    SessionStatus,
    AttendanceMethod,
    AttendanceStatus,
    Device
)


class AttendanceService:
    """
    Central business logic service for recording and auditing student attendance across
    all multi-modal ingest channels (RFID, Fingerprint, Face Recognition, and Manual Roll Call).
    """

    @staticmethod
    def process_attendance(
        db: Session,
        student_id: str,
        method: AttendanceMethod,
        session_id: Optional[str] = None,
        device_id: Optional[str] = None,
        custom_status: Optional[AttendanceStatus] = None,
        timestamp: Optional[datetime] = None
    ) -> Tuple[AttendanceRecord, str]:
        """
        Processes an incoming attendance mark through the unified 8-step validation pipeline:
        1. Validate the student exists and is active.
        2. Validate the attendance session exists.
        3. Check session is active.
        4. Verify student belongs to the relevant class.
        5. Check whether attendance already exists (duplicate prevention).
        6. Determine status (PRESENT/LATE/ABSENT).
        7. Create attendance record with database transaction.
        8. Return a clear response.
        """
        record_time = timestamp or datetime.now(timezone.utc)

        # 1. Validate Student
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student with ID '{student_id}' not found."
            )

        if not student.user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Student account '{student_id}' is deactivated."
            )

        # 2 & 3. Validate Attendance Session
        session: Optional[AttendanceSession] = None
        if session_id:
            session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Attendance session '{session_id}' not found."
                )
        else:
            # If no session_id provided (e.g. physical RFID tap at room reader),
            # resolve active session for student's class
            if student.class_id:
                session = db.query(AttendanceSession).filter(
                    AttendanceSession.class_id == student.class_id,
                    AttendanceSession.status == SessionStatus.ACTIVE
                ).order_by(AttendanceSession.created_at.desc()).first()

            if not session:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"No active attendance session found for student's class section."
                )

        if session.status != SessionStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Attendance session '{session.id}' is closed."
            )

        # 4. Verify student belongs to the session class
        if student.class_id != session.class_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Student '{student.id}' is not enrolled in class '{session.class_obj.name}'."
            )

        # 5. Duplicate Check & Update Handler
        existing = db.query(AttendanceRecord).filter(
            AttendanceRecord.session_id == session.id,
            AttendanceRecord.student_id == student.id
        ).first()

        student_name = student.user.name if student.user else student.id

        if existing:
            if method == AttendanceMethod.MANUAL or custom_status is not None:
                existing.status = custom_status or AttendanceStatus.PRESENT
                existing.method = method
                existing.timestamp = record_time
                db.commit()
                db.refresh(existing)
                return existing, f"Attendance status updated to {existing.status.value} for '{student_name}'."
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Attendance already marked for student '{student_name}' ({student.id}) in this session."
            )

        # 6. Determine Status
        final_status = custom_status or AttendanceStatus.PRESENT

        # Validate Device if provided
        if device_id:
            device = db.query(Device).filter(Device.id == device_id).first()
            if device:
                device.last_seen = record_time

        # 7. Create Attendance Record
        record_id = f"ATT-{uuid.uuid4().hex[:8].upper()}"
        record = AttendanceRecord(
            id=record_id,
            student_id=student.id,
            session_id=session.id,
            timestamp=record_time,
            status=final_status,
            method=method,
            device_id=device_id
        )

        try:
            db.add(record)
            db.commit()
            db.refresh(record)
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Attendance already marked for this session (concurrency conflict)."
            )

        # 8. Return Record and Success Message
        msg = f"Attendance marked as {final_status.value} for {student_name} via {method.value}."
        return record, msg


attendance_service = AttendanceService()
