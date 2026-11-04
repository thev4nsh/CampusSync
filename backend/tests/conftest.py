import pytest
import os
import sys
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

# Ensure app is importable
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import Base, get_db
from app.models import (
    User,
    AuthSession,
    UserRole,
    Student,
    Teacher,
    Class,
    Subject,
    TeacherSubjectAssignment,
    AttendanceSession,
    RFIDCard,
    Device,
    DeviceType,
    Institution,
    SessionStatus
)
from app.security import get_password_hash, create_access_token, create_refresh_token, hash_refresh_token
from app.config import settings
from app.device_security import hash_device_key
from app.main import app

# In-memory SQLite Database for isolated testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Create fresh database tables for each test and drop them after."""
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    session.info["institution_id"] = 1
    session.add(Institution(id=1, name="Test College", slug="test-college", is_active=True))
    session.commit()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db):
    """Override get_db with test database session and return TestClient."""
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def seed_data(db):
    """Seed foundational test entities for tests."""
    # 1. Admin User
    admin_user = User(
        id=1,
        name="Admin Test",
        email="admin@test.edu",
        hashed_password=get_password_hash("AdminPass123!"),
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin_user)

    # 2. Class & Subject
    test_class = Class(
        id=1,
        name="CSE-3A",
        year="3rd Year",
        section="A",
        department="Computer Science"
    )
    test_subject = Subject(
        id=1,
        code="CS301",
        name="Data Structures",
        department="Computer Science"
    )
    db.add(test_class)
    db.add(test_subject)
    db.commit()

    # 3. Teacher User & Profile
    teacher_user = User(
        id=2,
        name="Prof. Sharma",
        email="sharma@test.edu",
        hashed_password=get_password_hash("TeacherPass123!"),
        role=UserRole.TEACHER,
        is_active=True
    )
    db.add(teacher_user)
    db.commit()

    teacher = Teacher(
        id="TCH101",
        user_id=teacher_user.id,
        department="Computer Science"
    )
    db.add(teacher)
    db.commit()

    # Assignment
    assignment = TeacherSubjectAssignment(
        teacher_id=teacher.id,
        subject_id=test_subject.id,
        class_id=test_class.id
    )
    db.add(assignment)

    # 4. Student User & Profile
    student_user = User(
        id=3,
        name="Aman Verma",
        email="aman@test.edu",
        hashed_password=get_password_hash("StudentPass123!"),
        role=UserRole.STUDENT,
        is_active=True
    )
    db.add(student_user)
    db.commit()

    student = Student(
        id="CSE23001",
        user_id=student_user.id,
        class_id=test_class.id,
        department="Computer Science",
        course="B.Tech CSE",
        year="3rd Year",
        section="A"
    )
    db.add(student)
    db.commit()

    # RFID Card
    rfid = RFIDCard(
        card_uid="RFID-TEST-001",
        student_id=student.id,
        is_active=True
    )
    db.add(rfid)
    device_key = "test-device-secret-key"
    device = Device(
        id="DEV-01",
        name="Test RFID reader",
        type=DeviceType.RFID,
        location="Test room",
        is_active=True,
        api_key_hash=hash_device_key(device_key),
    )
    db.add(device)
    db.commit()

    return {
        "admin_user": admin_user,
        "teacher_user": teacher_user,
        "student_user": student_user,
        "teacher": teacher,
        "student": student,
        "class": test_class,
        "subject": test_subject,
        "rfid_uid": "RFID-TEST-001",
        "device_key": device_key,
    }


@pytest.fixture
def admin_token(seed_data, db):
    return create_test_access_token(db, seed_data["admin_user"])


@pytest.fixture
def teacher_token(seed_data, db):
    return create_test_access_token(db, seed_data["teacher_user"])


@pytest.fixture
def student_token(seed_data, db):
    return create_test_access_token(db, seed_data["student_user"])


def create_test_access_token(db, user):
    session_id = str(uuid4())
    now = datetime.now(timezone.utc)
    refresh_token = create_refresh_token(subject=user.id, session_id=session_id)
    db.add(AuthSession(
        id=session_id,
        user_id=user.id,
        refresh_token_hash=hash_refresh_token(refresh_token),
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        last_used_at=now,
    ))
    db.commit()
    return create_access_token(subject=user.id, role=user.role.value, session_id=session_id)
