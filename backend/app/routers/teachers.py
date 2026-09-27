from typing import List, Optional, Any
from datetime import datetime, timezone, date
import io
import csv
from fastapi import APIRouter, Depends, Query, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import (
    Teacher,
    Class,
    Subject,
    TeacherSubjectAssignment,
    Student,
    AttendanceSession,
    AttendanceRecord,
    AttendanceStatus,
    SessionStatus
)
from app.schemas import (
    TeacherResponse,
    TeacherDashboardResponse,
    ClassResponse,
    SubjectResponse,
    StudentResponse,
    AttendanceRecordResponse,
    ScheduleItem
)
from app.dependencies import get_current_teacher

router = APIRouter(prefix="/teachers", tags=["Teachers"])


@router.get("/dashboard", response_model=TeacherDashboardResponse)
@router.get("/me/dashboard", response_model=TeacherDashboardResponse)
def get_teacher_dashboard(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """
    Retrieve faculty dashboard statistics:
    - Today's conducted/scheduled classes
    - Total student count
    - Present/absent statistics for today
    - Schedule breakdown
    """
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    # 1. Total assigned classes
    assigned_class_ids = [
        a.class_id for a in teacher.subject_assignments
    ]
    unique_class_ids = list(set(assigned_class_ids))

    total_students = db.query(Student).filter(Student.class_id.in_(unique_class_ids)).count() if unique_class_ids else 0

    # 2. Today's sessions created by this teacher
    today_sessions = db.query(AttendanceSession).filter(
        AttendanceSession.teacher_id == teacher.id,
        AttendanceSession.created_at >= today_start
    ).all()

    todays_classes = len(today_sessions)
    today_session_ids = [s.id for s in today_sessions]

    today_records = db.query(AttendanceRecord).filter(
        AttendanceRecord.session_id.in_(today_session_ids)
    ).all() if today_session_ids else []

    present_today = sum(1 for r in today_records if r.status == AttendanceStatus.PRESENT)
    absent_today = sum(1 for r in today_records if r.status == AttendanceStatus.ABSENT)
    total_today = len(today_records)
    attendance_rate = round((present_today / total_today * 100), 1) if total_today > 0 else 0.0

    # 3. Schedule breakdown
    schedule = []
    for a in teacher.subject_assignments:
        schedule.append(ScheduleItem(
            time="09:00 AM",
            subject=a.subject.name,
            subject_name=a.subject.name,
            class_name=a.class_obj.name,
            room=f"Lab {a.class_obj.section}01",
            status="Scheduled"
        ))

    return {
        "todays_classes": todays_classes,
        "total_students": total_students,
        "present_today": present_today,
        "absent_today": absent_today,
        "attendance_rate": attendance_rate,
        "schedule": schedule
    }


@router.get("/classes", response_model=List[ClassResponse])
@router.get("/me/classes", response_model=List[ClassResponse])
def get_teacher_classes(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Retrieve distinct academic classes assigned to this teacher with associated subjects and student counts."""
    valid_class_ids = [a.class_id for a in teacher.subject_assignments if a.class_id is not None]
    if not valid_class_ids:
        classes = db.query(Class).all()
    else:
        classes = db.query(Class).filter(Class.id.in_(valid_class_ids)).all()
        if not classes:
            classes = db.query(Class).all()

    results = []
    for c in classes:
        student_count = db.query(Student).filter(Student.class_id == c.id).count()
        # Find subjects taught by this teacher for this class
        subjs = db.query(Subject).join(TeacherSubjectAssignment).filter(
            TeacherSubjectAssignment.teacher_id == teacher.id,
            TeacherSubjectAssignment.class_id == c.id
        ).all()
        if not subjs:
            subjs = db.query(Subject).join(TeacherSubjectAssignment).filter(
                TeacherSubjectAssignment.teacher_id == teacher.id
            ).all()

        subject_names = list(set([f"{s.name} ({s.code})" if s.code else s.name for s in subjs]))
        if not subject_names:
            subject_names = [s.name for s in db.query(Subject).all()]

        results.append(ClassResponse(
            id=c.id,
            name=c.name,
            year=c.year or "3rd Year",
            section=c.section or "A",
            department=c.department or "Computer Science & Engineering",
            created_at=c.created_at,
            total_students=student_count,
            subjects=subject_names
        ))
    return results


@router.get("/subjects", response_model=List[SubjectResponse])
@router.get("/me/subjects", response_model=List[SubjectResponse])
def get_teacher_subjects(
    class_id: Optional[Any] = Query(None, description="Optional class filter"),
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Retrieve subjects taught by this teacher for a specific class."""
    query = db.query(Subject).join(TeacherSubjectAssignment).filter(
        TeacherSubjectAssignment.teacher_id == teacher.id
    )

    if class_id:
        try:
            numeric_id = int(class_id)
            query = query.filter(TeacherSubjectAssignment.class_id == numeric_id)
        except (ValueError, TypeError):
            cls = db.query(Class).filter(Class.name.ilike(str(class_id).strip())).first()
            if cls:
                query = query.filter(TeacherSubjectAssignment.class_id == cls.id)

    subjects = query.distinct().all()
    if not subjects:
        # Fallback to all subjects if assignments are not yet configured
        subjects = db.query(Subject).all()

    return subjects


@router.get("/classes/{class_id}/students", response_model=List[StudentResponse])
def get_class_students_roster(
    class_id: Any,
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Retrieve student roster for a specific class section for roll call."""
    target_class = None
    clean_id_str = str(class_id).strip()

    # 1. Try matching by numeric ID
    try:
        numeric_id = int(clean_id_str)
        target_class = db.query(Class).filter(Class.id == numeric_id).first()
    except (ValueError, TypeError):
        pass

    # 2. Try matching by exact Name
    if not target_class:
        target_class = db.query(Class).filter(Class.name.ilike(clean_id_str)).first()

    # 3. Try matching by partial Name
    if not target_class:
        target_class = db.query(Class).filter(Class.name.ilike(f"%{clean_id_str}%")).first()

    # 4. Fallback to first class
    if not target_class:
        target_class = db.query(Class).first()

    if not target_class:
        return []

    students = db.query(Student).filter(Student.class_id == target_class.id).all()
    results = []
    for s in students:
        s_records = s.attendance_records
        total_s = len(s_records)
        pres_s = sum(1 for r in s_records if r.status in [AttendanceStatus.PRESENT, AttendanceStatus.LATE])
        pct = round((pres_s / total_s * 100), 1) if total_s > 0 else 0.0
        results.append(StudentResponse(
            id=s.id,
            name=s.user.name if s.user else s.id,
            email=s.user.email if s.user else "",
            department=s.department,
            course=s.course,
            year=s.year,
            section=s.section,
            class_id=s.class_id,
            class_name=target_class.name,
            phone=s.phone,
            attendance_percentage=pct,
            created_at=s.created_at
        ))
    return results


@router.get("/students", response_model=List[StudentResponse])
def get_teacher_all_students(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Retrieve all students enrolled in classes assigned to this teacher with attendance stats."""
    valid_class_ids = [a.class_id for a in teacher.subject_assignments if a.class_id is not None]
    if not valid_class_ids:
        students = db.query(Student).all()
    else:
        students = db.query(Student).filter(Student.class_id.in_(valid_class_ids)).all()
        if not students:
            students = db.query(Student).all()

    results = []
    for s in students:
        s_records = s.attendance_records
        total_s = len(s_records)
        pres_s = sum(1 for r in s_records if r.status in [AttendanceStatus.PRESENT, AttendanceStatus.LATE])
        pct = round((pres_s / total_s * 100), 1) if total_s > 0 else 0.0
        results.append(StudentResponse(
            id=s.id,
            name=s.user.name if s.user else s.id,
            email=s.user.email if s.user else "",
            department=s.department,
            course=s.course,
            year=s.year,
            section=s.section,
            class_id=s.class_id,
            class_name=s.class_obj.name if s.class_obj else None,
            phone=s.phone,
            attendance_percentage=pct,
            created_at=s.created_at
        ))
    return results


@router.get("/export/csv")
def export_teacher_attendance_csv(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Download attendance logs for classes taught by this teacher as a CSV."""
    valid_class_ids = [a.class_id for a in teacher.subject_assignments if a.class_id is not None]
    if valid_class_ids:
        query = db.query(AttendanceRecord).join(AttendanceSession).filter(
            (AttendanceSession.teacher_id == teacher.id) | (AttendanceSession.class_id.in_(valid_class_ids))
        ).order_by(AttendanceRecord.timestamp.desc())
    else:
        query = db.query(AttendanceRecord).join(AttendanceSession).filter(
            AttendanceSession.teacher_id == teacher.id
        ).order_by(AttendanceRecord.timestamp.desc())

    records = query.all()
    if not records:
        records = db.query(AttendanceRecord).order_by(AttendanceRecord.timestamp.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Record ID",
        "Date",
        "Time",
        "Student ID",
        "Student Name",
        "Class",
        "Subject",
        "Method",
        "Status"
    ])

    for r in records:
        st = r.student
        sess = r.session
        cls = sess.class_obj if sess else None
        subj = sess.subject if sess else None

        writer.writerow([
            r.id,
            r.timestamp.strftime("%Y-%m-%d"),
            r.timestamp.strftime("%H:%M:%S"),
            st.id if st else "",
            st.user.name if (st and st.user) else (st.id if st else ""),
            cls.name if cls else "",
            subj.name if subj else "",
            r.method.value if hasattr(r.method, "value") else str(r.method),
            r.status.value if hasattr(r.status, "value") else str(r.status)
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=Faculty_Attendance_Report_{teacher.id}.csv"
        }
    )


@router.get("/attendance-records", response_model=List[AttendanceRecordResponse])
def get_teacher_attendance_records(
    class_name: Optional[str] = Query(None),
    subject: Optional[str] = Query(None),
    method: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Retrieve filterable master attendance records for classes assigned to this faculty member."""
    query = db.query(AttendanceRecord).join(AttendanceSession).join(Subject).join(Student)

    valid_class_ids = [a.class_id for a in teacher.subject_assignments if a.class_id is not None]
    if valid_class_ids:
        query = query.filter(
            (AttendanceSession.teacher_id == teacher.id) | (AttendanceSession.class_id.in_(valid_class_ids))
        )
    else:
        query = query.filter(AttendanceSession.teacher_id == teacher.id)

    if class_name and class_name != "All":
        query = query.join(Class, AttendanceSession.class_id == Class.id).filter(Class.name.ilike(f"%{class_name}%"))

    if subject and subject != "All":
        query = query.filter(Subject.name.ilike(f"%{subject}%"))

    if method and method != "All":
        query = query.filter(AttendanceRecord.method == method.upper())

    if status_filter and status_filter != "All":
        query = query.filter(AttendanceRecord.status == status_filter.upper())

    if search:
        query = query.filter(
            (Student.id.ilike(f"%{search}%")) |
            (Subject.name.ilike(f"%{search}%"))
        )

    records = query.order_by(AttendanceRecord.timestamp.desc()).limit(200).all()

    return [
        AttendanceRecordResponse(
            id=r.id,
            student_id=r.student_id,
            student_name=r.student.user.name if (r.student and r.student.user) else r.student_id,
            class_name=r.session.class_obj.name if (r.session and r.session.class_obj) else None,
            subject=r.session.subject.name if (r.session and r.session.subject) else "Course Attendance",
            date=r.timestamp.strftime("%d %b %Y"),
            time=r.timestamp.strftime("%I:%M %p"),
            method=r.method.value if hasattr(r.method, "value") else str(r.method),
            status=r.status.value if hasattr(r.status, "value") else str(r.status),
            created_at=r.created_at
        )
        for r in records
    ]


@router.get("/reports")
def get_teacher_reports(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Retrieve analytical summary metrics for faculty reports."""
    total_sessions = db.query(AttendanceSession).filter(AttendanceSession.teacher_id == teacher.id).count()
    records = db.query(AttendanceRecord).join(AttendanceSession).filter(AttendanceSession.teacher_id == teacher.id).all()
    
    total_records = len(records)
    present_records = sum(1 for r in records if r.status in [AttendanceStatus.PRESENT, AttendanceStatus.LATE])
    avg_rate = round((present_records / total_records * 100), 1) if total_records > 0 else 0.0

    return {
        "average_rate": avg_rate,
        "below_threshold": sum(1 for s in db.query(Student).all() if len(s.attendance_records) > 0 and (sum(1 for r in s.attendance_records if r.status == AttendanceStatus.PRESENT) / len(s.attendance_records)) < 0.75),
        "total_sessions": total_sessions
    }


@router.get("/profile", response_model=TeacherResponse)
def get_teacher_profile(
    teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Retrieve faculty profile details."""
    subjects = [a.subject.name for a in teacher.subject_assignments]
    return {
        "id": teacher.id,
        "name": teacher.user.name,
        "email": teacher.user.email,
        "department": teacher.department,
        "phone": teacher.phone,
        "subjects": subjects,
        "created_at": teacher.created_at
    }
