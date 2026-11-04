import pytest
from fastapi import HTTPException

from app.config import settings
from app.models import UserRole
from app.services.ai_usage_service import consume_ai_request


def test_ai_daily_limit_is_enforced(client, db, seed_data, monkeypatch):
    monkeypatch.setattr(settings, "AI_DAILY_LIMIT_STUDENT", 1)
    student = seed_data["student_user"]

    used, limit = consume_ai_request(db, student)
    assert (used, limit) == (1, 1)
    with pytest.raises(HTTPException) as err:
        consume_ai_request(db, student)
    assert err.value.status_code == 429


def test_staff_gets_staff_daily_limit(client, db, seed_data, monkeypatch):
    monkeypatch.setattr(settings, "AI_DAILY_LIMIT_STAFF", 2)
    teacher = seed_data["teacher_user"]

    assert teacher.role == UserRole.TEACHER
    assert consume_ai_request(db, teacher) == (1, 2)
    assert consume_ai_request(db, teacher) == (2, 2)
