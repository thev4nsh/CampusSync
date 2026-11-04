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


def test_refresh_rotates_refresh_token(client, seed_data):
    login = client.post(
        "/api/auth/login",
        json={"identifier": "admin@test.edu", "password": "AdminPass123!"},
    )
    old_refresh = login.json()["refresh_token"]
    refreshed = client.post("/api/auth/refresh", json={"refresh_token": old_refresh})
    assert refreshed.status_code == 200
    data = refreshed.json()
    assert data["access_token"]
    assert data["refresh_token"] != old_refresh
    assert client.post("/api/auth/refresh", json={"refresh_token": old_refresh}).status_code == 401


def test_logout_revokes_only_the_current_session(client, seed_data):
    login = client.post(
        "/api/auth/login",
        json={"identifier": "admin@test.edu", "password": "AdminPass123!"},
    )
    access = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {access}"}
    assert client.get("/api/auth/me", headers=headers).status_code == 200
    assert client.post("/api/auth/logout", headers=headers).status_code == 200
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_forgot_password_does_not_claim_to_send_email(client):
    response = client.post("/api/auth/forgot-password", json={"identifier": "nobody@test.edu"})
    assert response.status_code == 501
    assert "not configured" in response.json()["detail"].lower()
