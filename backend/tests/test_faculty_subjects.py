import pytest

def test_create_teacher_with_subjects_assignment(client, seed_data, admin_token):
    # 1. Create a new teacher with assigned subjects
    payload = {
        "id": "TCH999",
        "name": "Prof. Test Instructor",
        "email": "test.instructor@campussync.edu",
        "password": "Teacher@123",
        "department": "Computer Science & Engineering",
        "phone": "+91 9998887776",
        "subjects": ["Compiler Design", "CSC502"]
    }
    
    create_res = client.post(
        "/api/admin/teachers",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert create_res.status_code == 201, create_res.text
    created_data = create_res.json()
    assert created_data["id"] == "TCH999"
    assert len(created_data["subjects"]) >= 1
    assert any("Compiler Design" in s for s in created_data["subjects"])

    # 2. Verify list_teachers returns the assigned subjects
    list_res = client.get(
        "/api/admin/teachers",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert list_res.status_code == 200
    teachers = list_res.json()
    tch = next((t for t in teachers if t["id"] == "TCH999"), None)
    assert tch is not None
    assert len(tch["subjects"]) >= 1

    # 3. Update teacher subjects
    update_res = client.put(
        "/api/admin/teachers/TCH999",
        json={
            "name": "Prof. Test Instructor Updated",
            "subjects": ["Microprocessor and Microcontroller"]
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert update_res.status_code == 200, update_res.text
    updated_data = update_res.json()
    assert "Microprocessor and Microcontroller" in updated_data["subjects"]
