import pytest

from app.models import (
    AttendanceMethod,
    AttendanceRecord,
    AttendanceSession,
    AttendanceStatus,
    CourseMaterial,
    Institution,
    SessionStatus,
    Student,
    Subject,
    Teacher,
    Class,
    User,
    UserRole,
)
from app.security import get_password_hash


def test_orm_queries_are_isolated_to_authenticated_institution(
    client, db, seed_data, student_token, monkeypatch
):
    institution = Institution(id=2, name="Second College", slug="second-college", is_active=True)
    admin = User(
        id=4,
        institution_id=2,
        name="Second College Admin",
        email="admin@second.example",
        hashed_password=get_password_hash("SecondCollegeAdmin2026!"),
        role=UserRole.ADMIN,
        is_active=True,
    )
    class_obj = Class(
        id=2,
        institution_id=2,
        name="CSE-3A",
        year="3rd Year",
        section="A",
        department="Computer Science",
    )
    student_user = User(
        id=5,
        institution_id=2,
        name="Second College Student",
        email="student@second.example",
        hashed_password=get_password_hash("SecondCollegeStudent2026!"),
        role=UserRole.STUDENT,
        is_active=True,
    )
    student = Student(
        id="CSE33002",
        institution_id=2,
        user_id=student_user.id,
        class_id=class_obj.id,
        department="Computer Science",
        course="B.Tech CSE",
        year="3rd Year",
        section="A",
    )
    teacher_user = User(
        id=6,
        institution_id=2,
        name="Second College Teacher",
        email="teacher@second.example",
        hashed_password=get_password_hash("SecondCollegeTeacher2026!"),
        role=UserRole.TEACHER,
        is_active=True,
    )
    teacher = Teacher(
        id="TCH201",
        institution_id=2,
        user_id=teacher_user.id,
        department="Computer Science",
    )
    subject = Subject(
        id=2,
        institution_id=2,
        code="CS401",
        name="Algorithms",
        department="Computer Science",
    )
    material = CourseMaterial(
        id="second-college-material",
        institution_id=2,
        title="Private second college notes",
        content="Only second college students may use these notes.",
        class_id=class_obj.id,
        subject_id=subject.id,
        teacher_id=teacher.id,
        version=1,
    )
    second_session = AttendanceSession(
        id="SES-SECOND-COLLEGE",
        institution_id=2,
        teacher_id=teacher.id,
        class_id=class_obj.id,
        subject_id=subject.id,
        status=SessionStatus.ACTIVE,
    )
    second_record = AttendanceRecord(
        id="ATT-SECOND-COLLEGE",
        institution_id=2,
        student_id=student.id,
        session_id=second_session.id,
        status=AttendanceStatus.PRESENT,
        method=AttendanceMethod.MANUAL,
    )
    db.info["institution_id"] = 2
    db.add_all([
        institution, admin, class_obj, student_user, student, teacher_user, teacher,
        subject, material, second_session, second_record,
    ])
    db.commit()
    db.info["institution_id"] = 1
    first_session = AttendanceSession(
        id="SES-FIRST-COLLEGE",
        institution_id=1,
        teacher_id=seed_data["teacher"].id,
        class_id=seed_data["class"].id,
        subject_id=seed_data["subject"].id,
        status=SessionStatus.ACTIVE,
    )
    db.add(first_session)
    db.add(AttendanceRecord(
        id="ATT-FIRST-COLLEGE",
        institution_id=1,
        student_id=seed_data["student"].id,
        session_id=first_session.id,
        status=AttendanceStatus.PRESENT,
        method=AttendanceMethod.MANUAL,
    ))
    db.commit()
    login = client.post("/api/auth/login", json={
        "identifier": admin.email,
        "password": "SecondCollegeAdmin2026!",
    })
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    listed = client.get("/api/admin/students", headers=headers)
    assert listed.status_code == 200, listed.text
    assert [row["id"] for row in listed.json()] == ["CSE33002"]

    hidden = client.put("/api/admin/students/CSE23001", json={"name": "Attempted"}, headers=headers)
    assert hidden.status_code == 404

    dashboard = client.get("/api/admin/dashboard", headers=headers)
    assert dashboard.status_code == 200, dashboard.text
    assert dashboard.json()["total_students"] == 1

    cleared = client.post("/api/admin/database/clear-attendance", headers=headers)
    assert cleared.status_code == 200, cleared.text
    assert "1 attendance records and 1 sessions" in cleared.json()["message"]
    db.info["institution_id"] = 1
    assert db.query(AttendanceRecord).count() == 1
    db.info["institution_id"] = 2
    assert db.query(AttendanceRecord).count() == 0

    from app.routers import learning as learning_router
    monkeypatch.setattr(learning_router, "summarize_material", lambda _content: pytest.fail("Cross-college source reached AI"))
    ai_response = client.post(
        f"/api/ai/materials/{material.id}/summary",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert ai_response.status_code == 404
