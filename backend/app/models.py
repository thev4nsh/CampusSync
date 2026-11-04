import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Enum,
    UniqueConstraint,
    Text,
    event,
)
from sqlalchemy.orm import relationship, Session, with_loader_criteria
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

class TenantScoped:
    """Mixin for rows that belong to one college."""
    institution_id = Column(Integer, ForeignKey("institutions.id", ondelete="CASCADE"), nullable=False, index=True)


class Institution(Base):
    __tablename__ = "institutions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(160), nullable=False)
    slug = Column(String(80), unique=True, index=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class User(TenantScoped, Base):
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
    auth_sessions = relationship("AuthSession", back_populates="user", cascade="all, delete-orphan")


class AuthSession(Base):
    """One revocable, rotating login session per browser or device."""
    __tablename__ = "auth_sessions"

    id = Column(String(36), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    refresh_token_hash = Column(String(64), nullable=False, unique=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_used_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    user = relationship("User", back_populates="auth_sessions")


class AIUsageDaily(Base):
    """Atomic per-user daily request counter for AI cost and abuse limits."""
    __tablename__ = "ai_usage_daily"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    usage_date = Column(Date, nullable=False, index=True)
    request_count = Column(Integer, nullable=False, default=0)

    __table_args__ = (UniqueConstraint("user_id", "usage_date", name="uq_ai_usage_user_date"),)


class Class(TenantScoped, Base):
    """
    Academic class / batch section (e.g. CSE-3A).
    """
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(50), index=True, nullable=False)
    year = Column(String(50), nullable=False)
    section = Column(String(10), nullable=False)
    department = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("institution_id", "name", name="uq_classes_institution_name"),)

    # Relationships
    students = relationship("Student", back_populates="class_obj")
    teacher_assignments = relationship("TeacherSubjectAssignment", back_populates="class_obj")
    sessions = relationship("AttendanceSession", back_populates="class_obj")


class Subject(TenantScoped, Base):
    """
    Academic course subject (e.g. Data Structures - CS301).
    """
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    code = Column(String(20), index=True, nullable=False)
    name = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("institution_id", "code", name="uq_subjects_institution_code"),)

    # Relationships
    teacher_assignments = relationship("TeacherSubjectAssignment", back_populates="subject")
    sessions = relationship("AttendanceSession", back_populates="subject")


class Teacher(TenantScoped, Base):
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


class Student(TenantScoped, Base):
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


class TeacherSubjectAssignment(TenantScoped, Base):
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


class CourseMaterial(TenantScoped, Base):
    """
    Text course material with a cached summary for an assigned class and subject.
    """
    __tablename__ = "course_materials"

    id = Column(String(36), primary_key=True, index=True)
    title = Column(String(180), nullable=False)
    content = Column(Text, nullable=False)
    content_type = Column(String(30), nullable=False, default="text/markdown")
    source_url = Column(String(500), nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    teacher_id = Column(String(50), ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, nullable=False, default=1)
    summary = Column(Text, nullable=True)
    summary_version = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    attachments = relationship("CourseMaterialAttachment", back_populates="material", cascade="all, delete-orphan")
    class_obj = relationship("Class")
    subject = relationship("Subject")

    @property
    def class_name(self) -> str | None:
        return self.class_obj.name if self.class_obj else None

    @property
    def subject_name(self) -> str | None:
        return self.subject.name if self.subject else None

    @property
    def ai_ready(self) -> bool:
        return len((self.content or "").strip()) >= 20


class CourseMaterialAttachment(TenantScoped, Base):
    """Private files attached to a class/subject course material post."""
    __tablename__ = "course_material_attachments"

    id = Column(String(36), primary_key=True, index=True)
    material_id = Column(String(36), ForeignKey("course_materials.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(120), nullable=False)
    size_bytes = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    material = relationship("CourseMaterial", back_populates="attachments")


class CourseAnnouncement(TenantScoped, Base):
    """Teacher-published class notice with private optional attachments."""
    __tablename__ = "course_announcements"

    id = Column(String(36), primary_key=True, index=True)
    title = Column(String(180), nullable=False)
    message = Column(Text, nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    teacher_id = Column(String(50), ForeignKey("teachers.id", ondelete="CASCADE"), nullable=False, index=True)
    priority = Column(String(20), nullable=False, default="normal", server_default="normal")
    is_alert = Column(Boolean, nullable=False, default=False, server_default="false")
    link_url = Column(Text, nullable=True)
    link_label = Column(String(120), nullable=True)
    event_date = Column(Date, nullable=True, index=True)
    pdf_path = Column(String(500), nullable=True)
    pdf_filename = Column(String(255), nullable=True)
    file_path = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_content_type = Column(String(120), nullable=True)
    poster_path = Column(String(500), nullable=True)
    poster_filename = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    class_obj = relationship("Class")
    subject_obj = relationship("Subject")

    @property
    def class_name(self) -> str | None:
        return self.class_obj.name if self.class_obj else None

    @property
    def subject_name(self) -> str | None:
        return self.subject_obj.name if self.subject_obj else None

    @property
    def has_pdf(self) -> bool:
        return bool(self.pdf_path)

    @property
    def has_attachment(self) -> bool:
        return bool(self.file_path or self.pdf_path)

    @property
    def attachment_filename(self) -> str | None:
        return self.file_name or self.pdf_filename

    @property
    def has_poster(self) -> bool:
        return bool(self.poster_path)


class AttendanceSession(TenantScoped, Base):
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


class Device(TenantScoped, Base):
    """
    Physical hardware terminal (RFID reader, Fingerprint sensor, Face camera).
    """
    __tablename__ = "devices"

    id = Column(String(50), primary_key=True, index=True)  # e.g. DEV-01
    name = Column(String(100), nullable=False)
    type = Column(Enum(DeviceType, name="device_type", native_enum=False), nullable=False)
    location = Column(String(100), nullable=False)
    ip_address = Column(String(50), nullable=True)
    api_key_hash = Column(String(64), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    last_seen = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    records = relationship("AttendanceRecord", back_populates="device")


class AttendanceRecord(TenantScoped, Base):
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


class RFIDCard(TenantScoped, Base):
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


class BiometricIdentity(TenantScoped, Base):
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


class SystemSetting(TenantScoped, Base):
    """
    Institutional rules and system configuration.
    """
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    key = Column(String(100), index=True, nullable=False)
    value = Column(String(255), nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("institution_id", "key", name="uq_system_settings_institution_key"),)


@event.listens_for(Session, "do_orm_execute")
def _apply_institution_scope(execute_state):
    """Filter ORM reads and bulk mutations to the institution bound to the request session."""
    institution_id = execute_state.session.info.get("institution_id")
    if institution_id is None:
        return
    if execute_state.is_select:
        execute_state.statement = execute_state.statement.options(
            with_loader_criteria(
                TenantScoped,
                lambda model: model.institution_id == institution_id,
                include_aliases=True,
            )
        )
    elif execute_state.is_update or execute_state.is_delete:
        mapper = execute_state.bind_mapper
        if mapper is not None and issubclass(mapper.class_, TenantScoped):
            execute_state.statement = execute_state.statement.where(
                mapper.class_.institution_id == institution_id
            )


@event.listens_for(Session, "before_flush")
def _stamp_institution_scope(session, _flush_context, _instances):
    institution_id = session.info.get("institution_id")
    for obj in session.new:
        if isinstance(obj, TenantScoped) and obj.institution_id is None:
            if institution_id is None:
                raise ValueError(f"{obj.__class__.__name__} requires an institution context")
            obj.institution_id = institution_id

    tenant_id = session.info.get("institution_id")
    if tenant_id is None:
        return

    references = {
        Student: (("user_id", User, "id"), ("class_id", Class, "id")),
        Teacher: (("user_id", User, "id"),),
        TeacherSubjectAssignment: (
            ("teacher_id", Teacher, "id"), ("subject_id", Subject, "id"), ("class_id", Class, "id"),
        ),
        CourseMaterial: (
            ("class_id", Class, "id"), ("subject_id", Subject, "id"), ("teacher_id", Teacher, "id"),
        ),
        CourseMaterialAttachment: (("material_id", CourseMaterial, "id"),),
        CourseAnnouncement: (
            ("class_id", Class, "id"), ("subject_id", Subject, "id"), ("teacher_id", Teacher, "id"),
        ),
        AttendanceSession: (
            ("teacher_id", Teacher, "id"), ("class_id", Class, "id"), ("subject_id", Subject, "id"),
        ),
        AttendanceRecord: (
            ("student_id", Student, "id"), ("session_id", AttendanceSession, "id"), ("device_id", Device, "id"),
        ),
        RFIDCard: (("student_id", Student, "id"),),
        BiometricIdentity: (("student_id", Student, "id"),),
    }
    pending = list(session.new)
    for obj in set(session.new).union(session.dirty):
        if not isinstance(obj, TenantScoped):
            continue
        for foreign_key, target_model, target_key in references.get(type(obj), ()):
            target_value = getattr(obj, foreign_key)
            if target_value is None:
                continue
            pending_target = next(
                (candidate for candidate in pending
                 if isinstance(candidate, target_model) and getattr(candidate, target_key) == target_value),
                None,
            )
            if pending_target is not None:
                target_tenant_id = pending_target.institution_id
            else:
                with session.no_autoflush:
                    target_tenant_id = session.query(target_model.institution_id).filter(
                        getattr(target_model, target_key) == target_value
                    ).scalar()
            if target_tenant_id != tenant_id:
                raise ValueError(
                    f"{type(obj).__name__}.{foreign_key} must reference a record in the same institution"
                )
