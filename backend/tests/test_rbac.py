import pytest


def test_student_cannot_access_admin_endpoints(client, seed_data, student_token):
    response = client.get(
        "/api/admin/dashboard",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert response.status_code == 403


def test_teacher_cannot_delete_student(client, seed_data, teacher_token):
    response = client.delete(
        "/api/admin/students/CSE23001",
        headers={"Authorization": f"Bearer {teacher_token}"}
    )
    assert response.status_code == 403


def test_admin_can_access_admin_dashboard(client, seed_data, admin_token):
    response = client.get(
        "/api/admin/dashboard",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total_students"] == 1
    assert data["total_teachers"] == 1
