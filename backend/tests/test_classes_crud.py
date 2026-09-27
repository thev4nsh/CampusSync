import pytest
from app.models import Class, Subject, Student, AttendanceSession, AttendanceRecord, AttendanceMethod, AttendanceStatus, SessionStatus, Teacher


def test_admin_delete_class_with_students_and_sessions(client, seed_data, admin_token, teacher_token):
    # 1. Create a new class
    create_res = client.post(
        "/api/admin/classes",
        json={
            "name": "TEST-CLASS-99",
            "year": "4th Year",
            "section": "Z",
            "department": "Computer Science & Engineering"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert create_res.status_code == 201
    class_id = create_res.json()["id"]

    # 2. Start attendance session for this class
    sess_res = client.post(
        "/api/attendance/sessions",
        json={"class_id": class_id, "subject_id": 1},
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert sess_res.status_code == 201
    session_id = sess_res.json()["id"]

    # 3. Mark manual attendance record in that session
    client.post(
        "/api/attendance/manual",
        json={
            "session_id": session_id,
            "class_id": class_id,
            "subject_id": 1,
            "records": [{"student_id": "CSE23001", "status": "PRESENT"}]
        },
        headers={"Authorization": f"Bearer {teacher_token}"}
    )

    # 4. Admin deletes class - must cleanly succeed without 500 error or foreign key violation
    del_res = client.delete(
        f"/api/admin/classes/{class_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert del_res.status_code == 200
    assert "removed successfully" in del_res.json()["message"].lower()

    # 5. Verify class is no longer in list
    list_res = client.get(
        "/api/admin/classes",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert list_res.status_code == 200
    assert not any(c["id"] == class_id for c in list_res.json())


def test_admin_delete_subject_with_sessions(client, seed_data, admin_token, teacher_token):
    # 1. Create a new subject
    create_res = client.post(
        "/api/admin/subjects",
        json={
            "code": "SUB-TEST-99",
            "name": "Temporary Test Course",
            "department": "Computer Science & Engineering"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert create_res.status_code == 201
    subject_id = create_res.json()["id"]

    # 2. Start attendance session for this subject
    sess_res = client.post(
        "/api/attendance/sessions",
        json={"class_id": 1, "subject_id": subject_id},
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert sess_res.status_code == 201
    session_id = sess_res.json()["id"]

    # 3. Admin deletes subject - must cleanly succeed
    del_res = client.delete(
        f"/api/admin/subjects/{subject_id}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert del_res.status_code == 200
    assert "removed successfully" in del_res.json()["message"].lower()

    # 4. Verify subject is deleted
    list_res = client.get(
        "/api/admin/subjects",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert list_res.status_code == 200
    assert not any(s["id"] == subject_id for s in list_res.json())


def test_admin_export_all_attendance_csv(client, seed_data, admin_token):
    res = client.get(
        "/api/admin/reports/export/csv",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "Record ID" in res.text
    assert "Student ID" in res.text
    assert "Attendance Status" in res.text


def test_teacher_get_students_and_export_csv(client, seed_data, teacher_token):
    # 1. Get teacher students roster
    res = client.get(
        "/api/teachers/students",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert res.status_code == 200
    students = res.json()
    assert isinstance(students, list)
    assert len(students) > 0
    assert "attendance_percentage" in students[0]

    # 2. Export teacher attendance CSV
    csv_res = client.get(
        "/api/teachers/export/csv",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers["content-type"]
    assert "Record ID" in csv_res.text
    assert "Student Name" in csv_res.text
