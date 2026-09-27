import pytest


def test_login_success_with_email(client, seed_data):
    response = client.post(
        "/api/auth/login",
        json={"identifier": "admin@test.edu", "password": "AdminPass123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["role"] == "admin"
    assert data["user"]["email"] == "admin@test.edu"


def test_login_success_with_student_id(client, seed_data):
    response = client.post(
        "/api/auth/login",
        json={"identifier": "CSE23001", "password": "StudentPass123!"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "student"


def test_login_invalid_password(client, seed_data):
    response = client.post(
        "/api/auth/login",
        json={"identifier": "admin@test.edu", "password": "WrongPassword"}
    )
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]


def test_get_me_endpoint(client, seed_data, admin_token):
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == "admin@test.edu"


def test_unauthenticated_me_endpoint(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
