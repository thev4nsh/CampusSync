from typing import List, Dict, Any
import io
import csv
from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Class, Subject, Student, AttendanceRecord, AttendanceSession, AttendanceStatus
from app.dependencies import require_admin

router = APIRouter(prefix="/admin/reports", tags=["Reports"])


@router.get("/attendance")
def get_attendance_reports(
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Retrieve high-level institutional attendance statistics."""
    records = db.query(AttendanceRecord).all()
    total = len(records)
    present = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
    absent = sum(1 for r in records if r.status == AttendanceStatus.ABSENT)
    avg_rate = round((present / total * 100), 1) if total > 0 else 0.0

    return {
        "total_records": total,
        "present_count": present,
        "absent_count": absent,
        "average_attendance_rate": avg_rate,
        "institutional_compliance": "Satisfactory" if avg_rate >= 75 else "Warning"
    }


@router.get("/classes")
def get_class_reports(
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Retrieve attendance metrics grouped by academic class section."""
    classes = db.query(Class).all()
    results = []
    for c in classes:
        st_ids = [s.id for s in c.students]
        records = db.query(AttendanceRecord).filter(AttendanceRecord.student_id.in_(st_ids)).all() if st_ids else []
        tot = len(records)
        pres = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
        pct = round((pres / tot * 100), 1) if tot > 0 else 0.0

        results.append({
            "class_id": c.id,
            "class_name": c.name,
            "total_students": len(st_ids),
            "total_sessions": tot,
            "attendance_percentage": pct
        })
    return results


@router.get("/subjects")
def get_subject_reports(
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Retrieve attendance metrics grouped by course subject."""
    subjects = db.query(Subject).all()
    results = []
    for s in subjects:
        records = db.query(AttendanceRecord).join(AttendanceRecord.session).filter(
            AttendanceRecord.session.has(subject_id=s.id)
        ).all()
        tot = len(records)
        pres = sum(1 for r in records if r.status == AttendanceStatus.PRESENT)
        pct = round((pres / tot * 100), 1) if tot > 0 else 0.0

        results.append({
            "subject_id": s.id,
            "subject_code": s.code,
            "subject_name": s.name,
            "total_records": tot,
            "attendance_percentage": pct
        })
    return results


@router.get("/export/csv")
def export_all_attendance_csv(
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Download complete institutional attendance report in CSV format
    before archiving or resetting for a new academic semester.
    """
    records = db.query(AttendanceRecord).join(AttendanceSession).join(Subject).join(Student).order_by(AttendanceRecord.timestamp.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Record ID",
        "Date",
        "Time",
        "Student ID",
        "Student Name",
        "Class",
        "Academic Year",
        "Section",
        "Department",
        "Subject Code",
        "Subject Name",
        "Faculty / Instructor",
        "Authentication Method",
        "Attendance Status"
    ])

    for r in records:
        st = r.student
        sess = r.session
        cls = sess.class_obj if sess else None
        subj = sess.subject if sess else None
        teacher = sess.teacher if sess else None

        writer.writerow([
            r.id,
            r.timestamp.strftime("%Y-%m-%d"),
            r.timestamp.strftime("%H:%M:%S"),
            st.id if st else "",
            st.user.name if (st and st.user) else (st.id if st else ""),
            cls.name if cls else (st.class_obj.name if (st and st.class_obj) else ""),
            st.year if st else (cls.year if cls else ""),
            st.section if st else (cls.section if cls else ""),
            st.department if st else "",
            subj.code if subj else "",
            subj.name if subj else "",
            teacher.user.name if (teacher and teacher.user) else (teacher.id if teacher else ""),
            r.method.value if hasattr(r.method, "value") else str(r.method),
            r.status.value if hasattr(r.status, "value") else str(r.status)
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": "attachment; filename=CampusSync_Full_Semester_Attendance_Report.csv"
        }
    )
