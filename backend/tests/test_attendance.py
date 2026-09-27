import pytest


def test_start_attendance_session(client, seed_data, teacher_token):
    response = client.post(
        "/api/attendance/sessions",
        json={"class_id": 1, "subject_id": 1},
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["status"] == "active"
    assert data["class_name"] == "CSE-3A"


def test_rfid_attendance_marking_and_duplicate_prevention(client, seed_data, teacher_token):
    # 1. Start a session
    sess_res = client.post(
        "/api/attendance/sessions",
        json={"class_id": 1, "subject_id": 1},
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert sess_res.status_code == 201
    session_id = sess_res.json()["id"]

    # 2. Record first RFID scan
    rfid_res = client.post(
        "/api/attendance/rfid",
        json={
            "device_id": "DEV-01",
            "rfid_uid": "RFID-TEST-001",
            "session_id": session_id
        }
    )
    assert rfid_res.status_code == 200
    assert rfid_res.json()["success"] is True
    assert rfid_res.json()["status"] == "PRESENT"
    assert rfid_res.json()["student_id"] == "CSE23001"

    # 3. Duplicate scan attempt for the same student in the same session must return HTTP 409 Conflict
    dup_res = client.post(
        "/api/attendance/rfid",
        json={
            "device_id": "DEV-01",
            "rfid_uid": "RFID-TEST-001",
            "session_id": session_id
        }
    )
    assert dup_res.status_code == 409
    assert "already marked" in dup_res.json()["detail"].lower()


def test_student_dashboard_reflects_recorded_attendance(client, seed_data, teacher_token, student_token):
    # 1. Start session & mark attendance
    sess_res = client.post(
        "/api/attendance/sessions",
        json={"class_id": 1, "subject_id": 1},
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    session_id = sess_res.json()["id"]

    client.post(
        "/api/attendance/rfid",
        json={
            "device_id": "DEV-01",
            "rfid_uid": "RFID-TEST-001",
            "session_id": session_id
        }
    )

    # 2. Query student dashboard
    dash_res = client.get(
        "/api/students/me/dashboard",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert dash_res.status_code == 200
    data = dash_res.json()
    assert data["present_classes"] == 1
    assert data["overall_attendance"] == 100.0
    assert len(data["recent_records"]) == 1
    assert data["recent_records"][0]["method"] == "RFID"


def test_manual_attendance_marking(client, seed_data, teacher_token):
    # 1. Start session
    sess_res = client.post(
        "/api/attendance/sessions",
        json={"class_id": 1, "subject_id": 1},
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    session_id = sess_res.json()["id"]

    # 2. Submit manual roll call
    manual_res = client.post(
        "/api/attendance/manual",
        json={
            "session_id": session_id,
            "class_id": 1,
            "subject_id": 1,
            "records": [
                {"student_id": "CSE23001", "status": "PRESENT"}
            ]
        },
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert manual_res.status_code == 200
    assert manual_res.json()["success"] is True


def test_manual_attendance_standalone_without_session_saves_to_database(client, seed_data, teacher_token, student_token, admin_token):
    # 1. Submit manual roll call directly with no preexisting session
    manual_res = client.post(
        "/api/attendance/manual",
        json={
            "class_id": "CSE-3A",
            "subject_id": "Microprocessor and Microcontroller",
            "records": [
                {"student_id": "CSE23001", "status": "ABSENT"}
            ]
        },
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert manual_res.status_code == 200
    assert manual_res.json()["success"] is True

    # 2. Verify attendance records appear in teacher records
    t_rec_res = client.get(
        "/api/teachers/attendance-records",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert t_rec_res.status_code == 200
    t_records = t_rec_res.json()
    assert len(t_records) >= 1
    assert any(r["student_id"] == "CSE23001" and r["status"] == "ABSENT" for r in t_records)

    # 3. Verify attendance records appear in student attendance history
    s_att_res = client.get(
        "/api/students/attendance",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert s_att_res.status_code == 200
    s_records = s_att_res.json()
    assert len(s_records) >= 1
    assert any(r["status"] == "ABSENT" for r in s_records)

    # 4. Verify admin attendance logs reflect this
    admin_att_res = client.get(
        "/api/admin/attendance",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert admin_att_res.status_code == 200
    admin_records = admin_att_res.json()
    assert len(admin_records) >= 1


def test_teacher_my_classes_overview(client, seed_data, teacher_token):
    response = client.get(
        "/api/teachers/classes",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 200
    classes = response.json()
    assert len(classes) >= 1
    first_class = classes[0]
    assert "name" in first_class
    assert "year" in first_class
    assert "section" in first_class
    assert "total_students" in first_class
    assert "subjects" in first_class
    assert isinstance(first_class["subjects"], list)

