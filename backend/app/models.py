import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Enum,
    UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


# ==============================================================================
# ENUMERATIONS
# ==============================================================================

class UserRole(str, enum.Enum):
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"


class AttendanceMethod(str, enum.Enum):
    RFID = "RFID"
    FINGERPRINT = "FINGERPRINT"
    FACE = "FACE"
    MANUAL = "MANUAL"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    ABSENT = "ABSENT"
    LATE = "LATE"


class DeviceType(str, enum.Enum):
    RFID = "RFID"
    FINGERPRINT = "FINGERPRINT"
    FACE_CAMERA = "FACE_CAMERA"


class SessionStatus(str, enum.Enum):
    ACTIVE = "active"
    CLOSED = "closed"


# ==============================================================================
# DATABASE MODELS
# ==============================================================================

class User(Base):
    """
    Core User entity for authentication and RBAC.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole, name="user_role", native_enum=False), default=UserRole.STUDENT, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # One-to-one relationships
    student_profile = relationship("Student", back_populates="user", uselist=False, cascade="all, delete-orphan")
    teacher_profile = relationship("Teacher", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Class(Base):
    """
    Academic class / batch section (e.g. CSE-3A).
    """
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    year = Column(String(50), nullable=False)
    section = Column(String(10), nullable=False)
    department = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    students = relationship("Student", back_populates="class_obj")
    teacher_assignments = relationship("TeacherSubjectAssignment", back_populates="class_obj")
    sessions = relationship("AttendanceSession", back_populates="class_obj")


class Subject(Base):
    """
    Academic course subject (e.g. Data Structures - CS301).
    """
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    teacher_assignments = relationship("TeacherSubjectAssignment", back_populates="subject")
    sessions = relationship("AttendanceSession", back_populates="subject")


class Teacher(Base):
    """
    Faculty profile entity linked to a User account.
    """
    __tablename__ = "teachers"

    id = Column(String(50), primary_key=True, index=True)  # e.g. TCH101
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    department = Column(String(100), nullable=False)
    phone = Column(String(25), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="teacher_profile")
    subject_assignments = relationship("TeacherSubjectAssignment", back_populates="teacher", cascade="all, delete-orphan")
    attendance_sessions = relationship("AttendanceSession", back_populates="teacher")

    @property
    def name(self) -> str:
        return self.user.name if self.user else self.id


class Student(Base):
    """
    Student profile entity linked to a User account.
    """
    __tablename__ = "students"

    id = Column(String(50), primary_key=True, index=True)  # e.g. CSE23001
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="SET NULL"), nullable=True)
    department = Column(String(100), nullable=False)
    course = Column(String(100), nullable=False, default="B.Tech CSE")
    year = Column(String(50), nullable=False, default="3rd Year")
    section = Column(String(10), nullable=False, default="A")
    phone = Column(String(25), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="student_profile")
    class_obj = relationship("Class", back_populates="students")
    rfid_card = relationship("RFIDCard", back_populates="student", uselist=False, cascade="all, delete-orphan")
    biometric_identity = relationship("BiometricIdentity", back_populates="student", uselist=False, cascade="all, delete-orphan")
    attendance_records = relationship("AttendanceRecord", back_populates="student", cascade="all, delete-orphan")

    @property
    def name(self) -> str:
        return self.user.name if self.user else self.id


class TeacherSubjectAssignment(Base):
    """
    Relational assignment mapping a Teacher to a Subject and specific Class.
    """
    __tablename__ = "teacher_subject_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    teacher_id = Column(String(50), ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("teacher_id", "subject_id", "class_id", name="uq_teacher_subject_class"),
    )

    # Relationships
    teacher = relationship("Teacher", back_populates="subject_assignments")
    subject = relationship("Subject", back_populates="teacher_assignments")
    class_obj = relationship("Class", back_populates="teacher_assignments")


class AttendanceSession(Base):
    """
    Active or historical attendance session initiated by a Teacher for a Class and Subject.
    """
    __tablename__ = "attendance_sessions"

    id = Column(String(50), primary_key=True, index=True)  # e.g. SES-100234
    teacher_id = Column(String(50), ForeignKey("teachers.id", ondelete="RESTRICT"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="RESTRICT"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=False)
    start_time = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(Enum(SessionStatus, name="session_status", native_enum=False), default=SessionStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    teacher = relationship("Teacher", back_populates="attendance_sessions")
    class_obj = relationship("Class", back_populates="sessions")
    subject = relationship("Subject", back_populates="sessions")
    records = relationship("AttendanceRecord", back_populates="session", cascade="all, delete-orphan")


class Device(Base):
    """
    Physical hardware terminal (RFID reader, Fingerprint sensor, Face camera).
    """
    __tablename__ = "devices"

    id = Column(String(50), primary_key=True, index=True)  # e.g. DEV-01
    name = Column(String(100), nullable=False)
    type = Column(Enum(DeviceType, name="device_type", native_enum=False), nullable=False)
    location = Column(String(100), nullable=False)
    ip_address = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    records = relationship("AttendanceRecord", back_populates="device")


class AttendanceRecord(Base):
    """
    Core attendance entry per student per session with verification audit trail.
    """
    __tablename__ = "attendance_records"

    id = Column(String(50), primary_key=True, index=True)  # e.g. ATT-20489
    student_id = Column(String(50), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(String(50), ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    status = Column(Enum(AttendanceStatus, name="attendance_status", native_enum=False), default=AttendanceStatus.PRESENT, nullable=False)
    method = Column(Enum(AttendanceMethod, name="attendance_method", native_enum=False), nullable=False)
    device_id = Column(String(50), ForeignKey("devices.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Database-level constraint ensuring NO duplicate attendance for the same student in the same session
    __table_args__ = (
        UniqueConstraint("student_id", "session_id", name="uq_student_session_attendance"),
    )

    # Relationships
    student = relationship("Student", back_populates="attendance_records")
    session = relationship("AttendanceSession", back_populates="records")
    device = relationship("Device", back_populates="records")


class RFIDCard(Base):
    """
    RFID smart card credentials linked to a student (13.56 MHz UID).
    """
    __tablename__ = "rfid_cards"

    id = Column(Integer, primary_key=True, autoincrement=True)
    card_uid = Column(String(100), unique=True, index=True, nullable=False)
    student_id = Column(String(50), ForeignKey("students.id", ondelete="CASCADE"), unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    registered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    student = relationship("Student", back_populates="rfid_card")


class BiometricIdentity(Base):
    """
    Secure biometric references (fingerprint template index, face embedding ID).
    Raw image/biometric scans are NEVER stored directly in the database.
    """
    __tablename__ = "biometric_identities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(String(50), ForeignKey("students.id", ondelete="CASCADE"), unique=True, nullable=False)
    fingerprint_enrolled = Column(Boolean, default=False, nullable=False)
    fingerprint_template_id = Column(String(100), nullable=True)
    face_enrolled = Column(Boolean, default=False, nullable=False)
    face_reference_id = Column(String(100), nullable=True)
    registered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    student = relationship("Student", back_populates="biometric_identity")


class SystemSetting(Base):
    """
    Institutional rules and system configuration.
    """
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
