from typing import List, Optional, Generic, TypeVar, Any, Union, Literal
from datetime import date, datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator, model_validator
from app.models import UserRole, AttendanceMethod, AttendanceStatus, DeviceType, SessionStatus
from app.services.course_file_service import normalize_youtube_url

T = TypeVar("T")


def _validate_password_bytes(value: Optional[str]) -> Optional[str]:
    if value is not None and len(value.encode("utf-8")) > 72:
        raise ValueError("Password must be at most 72 UTF-8 bytes")
    return value


# ==============================================================================
# PAGINATION SCHEMA
# ==============================================================================

class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    page: int
    page_size: int
    total: int
    total_pages: int


# ==============================================================================
# AUTHENTICATION & USER SCHEMAS
# ==============================================================================

class AnnouncementResponse(BaseModel):
    id: str
    title: str
    message: str
    class_id: int
    class_name: Optional[str] = None
    subject_id: Optional[int] = None
    subject_name: Optional[str] = None
    teacher_id: str
    priority: str
    is_alert: bool
    link_url: Optional[str] = None
    link_label: Optional[str] = None
    event_date: Optional[date] = None
    pdf_filename: Optional[str] = None
    attachment_filename: Optional[str] = None
    poster_filename: Optional[str] = None
    has_pdf: bool
    has_attachment: bool
    has_poster: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CourseMaterialCreate(BaseModel):
    class_id: int
    subject_id: int
    title: str = Field(..., min_length=1, max_length=180)
    content_type: Literal["text/plain", "text/markdown"] = "text/markdown"
    content: str = Field("", max_length=100000)
    source_url: Optional[str] = Field(None, max_length=500)

    @field_validator("source_url")
    @classmethod
    def validate_youtube_url(cls, value: Optional[str]) -> Optional[str]:
        return normalize_youtube_url(value)

    @model_validator(mode="after")
    def require_notes_or_video(self):
        if len(self.content.strip()) < 20 and not self.source_url:
            raise ValueError("Add at least 20 characters of notes or a YouTube video link.")
        return self


class CourseMaterialUpdate(BaseModel):
    title: str = Field(..., min_length=1, max_length=180)
    content_type: Literal["text/plain", "text/markdown"] = "text/markdown"
    # Video-only posts have no notes; the router enforces notes-or-video.
    content: str = Field("", max_length=100000)

class CourseMaterialAttachmentResponse(BaseModel):
    id: str
    filename: str
    content_type: str
    size_bytes: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CourseMaterialResponse(BaseModel):
    id: str
    title: str
    class_id: int
    class_name: Optional[str] = None
    subject_id: int
    subject_name: Optional[str] = None
    teacher_id: str
    content_type: str
    source_url: Optional[str] = None
    version: int
    created_at: datetime
    updated_at: datetime
    ai_ready: bool = False
    attachments: List[CourseMaterialAttachmentResponse] = Field(default_factory=list)
    model_config = ConfigDict(from_attributes=True)

class CourseMaterialDetailResponse(CourseMaterialResponse):
    content: str


class CourseMaterialSummaryResponse(BaseModel):
    material_id: str
    material_version: int
    summary: str


class CourseQuestionRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000)


class CourseCitation(BaseModel):
    passage_id: str
    quote: str


class CourseQuestionResponse(BaseModel):
    material_id: str
    material_version: int
    answer: str
    citations: List[CourseCitation]
    abstained: bool

class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email address or Student/Teacher ID")
    password: str = Field(..., min_length=4)


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(..., min_length=32, max_length=8192)


class RefreshTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: str
    user: "UserResponse"


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None


class ForgotPasswordRequest(BaseModel):
    identifier: str


class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: UserRole = UserRole.STUDENT
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserResponse(UserBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# CLASS & SUBJECT SCHEMAS
# ==============================================================================

# ==============================================================================
# DEPARTMENT & BATCH SCHEMAS
# ==============================================================================

class DepartmentBase(BaseModel):
    code: str = Field(..., min_length=2, max_length=20)
    name: str = Field(..., min_length=2, max_length=120)


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    code: Optional[str] = Field(None, min_length=2, max_length=20)
    name: Optional[str] = Field(None, min_length=2, max_length=120)


class DepartmentResponse(DepartmentBase):
    id: int
    created_at: datetime
    batch_count: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


class BatchBase(BaseModel):
    name: str = Field(..., min_length=4, max_length=40, description="Admission year range, e.g. 2024-2028")
    department_id: int
    start_year: Optional[int] = Field(None, ge=1900, le=2200)
    end_year: Optional[int] = Field(None, ge=1900, le=2200)


class BatchCreate(BatchBase):
    pass


class BatchUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=4, max_length=40)
    department_id: Optional[int] = None
    start_year: Optional[int] = Field(None, ge=1900, le=2200)
    end_year: Optional[int] = Field(None, ge=1900, le=2200)


class BatchResponse(BatchBase):
    id: int
    department_name: Optional[str] = None
    department_code: Optional[str] = None
    class_count: Optional[int] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# CLASS & SUBJECT SCHEMAS
# ==============================================================================

class ClassBase(BaseModel):
    name: str
    year: str = "3rd Year"
    section: str = "A"
    department: str = "Computer Science & Engineering"
    batch_id: Optional[int] = None


class ClassCreate(ClassBase):
    pass


class ClassUpdate(BaseModel):
    name: Optional[str] = None
    year: Optional[str] = None
    section: Optional[str] = None
    department: Optional[str] = None
    batch_id: Optional[int] = None


class ClassResponse(ClassBase):
    id: int
    created_at: datetime
    total_students: Optional[int] = None
    subjects: List[str] = []
    batch_name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class SubjectBase(BaseModel):
    code: str
    name: str
    department: str = "Computer Science & Engineering"


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    department: Optional[str] = None


class SubjectResponse(SubjectBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class StudentClassroomResponse(BaseModel):
    id: int
    name: str
    year: str
    section: str
    department: str
    subjects: List[SubjectResponse] = Field(default_factory=list)


# ==============================================================================
# STUDENT SCHEMAS
# ==============================================================================

class StudentBase(BaseModel):
    department: str = "Computer Science & Engineering"
    course: str = "B.Tech CSE"
    year: str = "3rd Year"
    section: str = "A"
    roll_number: Optional[str] = None
    phone: Optional[str] = None
    batch_id: Optional[int] = None


class StudentCreate(StudentBase):
    id: str = Field(..., description="Student ID e.g. CSE23001")
    name: str
    email: EmailStr
    password: str = Field(..., min_length=12, max_length=72)
    class_id: Optional[int] = None
    class_name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_byte_length(cls, value: str) -> str:
        return _validate_password_bytes(value)


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=12, max_length=72)
    department: Optional[str] = None
    course: Optional[str] = None
    year: Optional[str] = None
    section: Optional[str] = None
    roll_number: Optional[str] = None
    phone: Optional[str] = None
    class_id: Optional[int] = None
    class_name: Optional[str] = None
    batch_id: Optional[int] = None

    @field_validator("password", mode="before")
    @classmethod
    def blank_password_keeps_current(cls, value):
        """An untouched (blank) password field means "keep the current password"."""
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("password")
    @classmethod
    def password_byte_length(cls, value: Optional[str]) -> Optional[str]:
        return _validate_password_bytes(value)


class BiometricsStatus(BaseModel):
    fingerprint: bool = False
    face: bool = False
    face_enrollment_samples: int = 0
    rfid: bool = False
    rfid_uid: Optional[str] = None


class StudentResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    department: str
    course: str
    year: str
    section: str
    class_id: Optional[int] = None
    class_name: Optional[str] = None
    batch_id: Optional[int] = None
    batch_name: Optional[str] = None
    roll_number: Optional[str] = None
    phone: Optional[str] = None
    attendance_percentage: Optional[float] = 0.0
    biometrics: Optional[BiometricsStatus] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# PUBLIC STUDENT REGISTRATION SCHEMAS
# ==============================================================================

class RegistrationLinkCreate(BaseModel):
    label: Optional[str] = Field(None, max_length=120)


class RegistrationLinkUpdate(BaseModel):
    label: Optional[str] = Field(None, max_length=120)
    is_active: Optional[bool] = None


class RegistrationLinkResponse(BaseModel):
    id: str
    token: str
    label: Optional[str] = None
    is_active: bool
    created_at: datetime
    request_count: int = 0
    pending_count: int = 0
    path: str


class RegistrationBatchOption(BaseModel):
    id: int
    name: str
    department_name: Optional[str] = None
    sections: List[str] = Field(default_factory=list)


class RegistrationClassOption(BaseModel):
    """A class created without an admission batch, still selectable by applicants."""
    id: int
    name: str
    section: Optional[str] = None
    department_name: Optional[str] = None


class PublicRegistrationInfo(BaseModel):
    """What the public form needs: branding plus the departments and batches it may choose from."""
    institution_name: str
    institution_short_name: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: bool
    link_label: Optional[str] = None
    departments: List[str] = Field(default_factory=list)
    batches: List[RegistrationBatchOption] = Field(default_factory=list)
    standalone_classes: List[RegistrationClassOption] = Field(default_factory=list)
    sections: List[str] = Field(default_factory=list)


class RegistrationSubmit(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=12, max_length=72, description="Password the student will sign in with")
    registration_number: str = Field(..., min_length=2, max_length=50, description="Used as the student ID to sign in")
    roll_number: str = Field(..., min_length=1, max_length=30)
    department: Optional[str] = Field(None, max_length=100, description="Department the applicant belongs to")
    batch_id: Optional[int] = None
    class_id: Optional[int] = None
    section: str = Field(default="", max_length=10)

    @field_validator("password")
    @classmethod
    def password_byte_length(cls, value: str) -> str:
        return _validate_password_bytes(value)


class RegistrationStatusResponse(BaseModel):
    reference: str
    name: str
    status: str
    decision_reason: Optional[str] = None
    created_at: datetime
    decided_at: Optional[datetime] = None


class RegistrationRequestResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    registration_number: str
    roll_number: str
    department: str
    batch_id: Optional[int] = None
    batch_name: Optional[str] = None
    section: Optional[str] = None
    course: str
    status: str
    decision_reason: Optional[str] = None
    student_id: Optional[str] = None
    link_label: Optional[str] = None
    created_at: datetime
    decided_at: Optional[datetime] = None


class RegistrationReject(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


# ==============================================================================
# TEACHER SCHEMAS
# ==============================================================================

class TeacherBase(BaseModel):
    department: str = "Computer Science & Engineering"
    phone: Optional[str] = None


class TeacherCreate(TeacherBase):
    id: str = Field(..., description="Teacher ID e.g. TCH101")
    name: str
    email: EmailStr
    password: str = Field(..., min_length=12, max_length=72)
    departments: Optional[List[str]] = None
    subjects: Optional[List[str]] = None

    @field_validator("password")
    @classmethod
    def password_byte_length(cls, value: str) -> str:
        return _validate_password_bytes(value)


class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=12, max_length=72)
    department: Optional[str] = None
    departments: Optional[List[str]] = None
    phone: Optional[str] = None
    subjects: Optional[List[str]] = None

    @field_validator("password", mode="before")
    @classmethod
    def blank_password_keeps_current(cls, value):
        """An untouched (blank) password field means "keep the current password"."""
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("password")
    @classmethod
    def password_byte_length(cls, value: Optional[str]) -> Optional[str]:
        return _validate_password_bytes(value)


class TeacherResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    department: str
    departments: List[str] = []
    phone: Optional[str] = None
    subjects: List[str] = []
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ==============================================================================
# ATTENDANCE SESSION & RECORD SCHEMAS
# ==============================================================================

class AttendanceSessionCreate(BaseModel):
    class_id: Any = Field(..., description="Class ID (integer) or Class Name (e.g. CSE-3A)")
    subject_id: Any = Field(..., description="Subject ID (integer) or Subject Name (e.g. Database Systems)")
    date: Optional[str] = None


class AttendanceSessionResponse(BaseModel):
    id: str
    teacher_id: str
    teacher_name: Optional[str] = None
    class_id: int
    class_name: str
    subject_id: int
    subject_name: str
    start_time: datetime
    end_time: Optional[datetime] = None
    status: SessionStatus
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AttendanceRecordResponse(BaseModel):
    id: str
    student_id: str
    student_name: str
    class_name: Optional[str] = None
    subject: str
    date: str
    time: str
    method: str
    status: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class AttendanceRecordCreateAdmin(BaseModel):
    student_id: str
    class_name: Optional[str] = None
    class_id: Optional[Any] = None
    subject_name: Optional[str] = None
    subject_id: Optional[Any] = None
    status: AttendanceStatus = AttendanceStatus.PRESENT
    method: AttendanceMethod = AttendanceMethod.MANUAL
    date: Optional[str] = None
    time: Optional[str] = None

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, v):
        if isinstance(v, AttendanceStatus):
            return v
        if isinstance(v, str):
            clean = v.strip().upper()
            if clean in ["PRESENT", "PRES", "P"]:
                return AttendanceStatus.PRESENT
            elif clean in ["ABSENT", "AB", "A"]:
                return AttendanceStatus.ABSENT
            elif clean in ["LATE", "L"]:
                return AttendanceStatus.LATE
        return AttendanceStatus.PRESENT

    @field_validator("method", mode="before")
    @classmethod
    def normalize_method(cls, v):
        if isinstance(v, AttendanceMethod):
            return v
        if isinstance(v, str):
            clean = v.strip().upper()
            if clean in ["RFID", "CARD"]:
                return AttendanceMethod.RFID
            elif clean in ["FINGERPRINT", "FP"]:
                return AttendanceMethod.FINGERPRINT
            elif clean in ["FACE", "CAMERA", "FACE RECOGNITION"]:
                return AttendanceMethod.FACE
            elif clean in ["MANUAL"]:
                return AttendanceMethod.MANUAL
        return AttendanceMethod.MANUAL


class AttendanceRecordUpdateAdmin(BaseModel):
    status: Optional[AttendanceStatus] = None
    method: Optional[AttendanceMethod] = None

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, v):
        if v is None:
            return None
        if isinstance(v, AttendanceStatus):
            return v
        if isinstance(v, str):
            clean = v.strip().upper()
            if clean in ["PRESENT", "PRES", "P"]:
                return AttendanceStatus.PRESENT
            elif clean in ["ABSENT", "AB", "A"]:
                return AttendanceStatus.ABSENT
            elif clean in ["LATE", "L"]:
                return AttendanceStatus.LATE
        return AttendanceStatus.PRESENT

    @field_validator("method", mode="before")
    @classmethod
    def normalize_method(cls, v):
        if v is None:
            return None
        if isinstance(v, AttendanceMethod):
            return v
        if isinstance(v, str):
            clean = v.strip().upper()
            if clean in ["RFID", "CARD"]:
                return AttendanceMethod.RFID
            elif clean in ["FINGERPRINT", "FP"]:
                return AttendanceMethod.FINGERPRINT
            elif clean in ["FACE", "CAMERA", "FACE RECOGNITION"]:
                return AttendanceMethod.FACE
            elif clean in ["MANUAL"]:
                return AttendanceMethod.MANUAL
        return AttendanceMethod.MANUAL


class ManualRecordItem(BaseModel):
    student_id: str
    student_name: Optional[str] = None
    status: AttendanceStatus = AttendanceStatus.PRESENT

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, v):
        if isinstance(v, AttendanceStatus):
            return v
        if isinstance(v, str):
            clean = v.strip().upper()
            if clean in ["PRESENT", "PRES", "P"]:
                return AttendanceStatus.PRESENT
            elif clean in ["ABSENT", "AB", "A"]:
                return AttendanceStatus.ABSENT
            elif clean in ["LATE", "L"]:
                return AttendanceStatus.LATE
        return AttendanceStatus.PRESENT


class ManualAttendanceRequest(BaseModel):
    session_id: Optional[str] = None
    class_id: Optional[Any] = None
    subject_id: Optional[Any] = None
    date: Optional[str] = None
    records: List[ManualRecordItem]


class RFIDAttendanceRequest(BaseModel):
    device_id: str
    rfid_uid: str
    session_id: Optional[str] = None
    timestamp: Optional[datetime] = None


class FingerprintAttendanceRequest(BaseModel):
    device_id: str
    template_id: str
    session_id: Optional[str] = None
    confidence: Optional[float] = None
    timestamp: Optional[datetime] = None


class FaceAttendanceRequest(BaseModel):
    device_id: str
    student_id: str
    session_id: Optional[str] = None
    confidence: Optional[float] = None
    timestamp: Optional[datetime] = None


class FaceAttendanceConfirmRequest(BaseModel):
    session_id: str
    student_id: str
    match_token: str
    confirm_in_person: bool = False


class AttendanceSubmissionResponse(BaseModel):
    success: bool
    message: str
    record: Optional[AttendanceRecordResponse] = None
    student_name: Optional[str] = None
    student_id: Optional[str] = None
    status: Optional[str] = None
    method: Optional[str] = None


# ==============================================================================
# DEVICE SCHEMAS
# ==============================================================================

class DeviceBase(BaseModel):
    name: str
    type: DeviceType
    location: str
    ip_address: Optional[str] = None
    is_active: bool = True


class DeviceCreate(DeviceBase):
    id: Optional[str] = None


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    ip_address: Optional[str] = None
    is_active: Optional[bool] = None


class DeviceStatusUpdate(BaseModel):
    status: str


class DeviceResponse(DeviceBase):
    id: str
    status: str = "Online"
    last_seen: Optional[datetime] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class DeviceCredentialResponse(BaseModel):
    device_id: str
    api_key: str
    message: str = "Store this key securely. It will not be shown again."


# ==============================================================================
# DASHBOARD SCHEMAS
# ==============================================================================

class SubjectBreakdownItem(BaseModel):
    code: str
    subject_name: str
    present: int
    total: int
    percentage: float


class StudentDashboardResponse(BaseModel):
    overall_attendance: float
    present_classes: int
    absent_classes: int
    total_classes: int
    subject_breakdown: List[SubjectBreakdownItem]
    recent_records: List[AttendanceRecordResponse]


class ScheduleItem(BaseModel):
    time: str
    subject: str
    subject_name: str
    class_name: str
    room: str
    status: str


class SubjectStudentAttendance(BaseModel):
    student_id: str
    student_name: str
    class_name: Optional[str] = None
    present: int
    total: int
    percentage: float


class SubjectAttendanceResponse(BaseModel):
    class_id: int
    class_name: str
    subject_id: int
    subject_name: str
    sessions_held: int
    total_records: int
    students: List[SubjectStudentAttendance] = Field(default_factory=list)


class TeacherAssignmentCreate(BaseModel):
    teacher_id: str
    class_id: int
    subject_ids: List[int] = Field(..., min_length=1)


class TeacherAssignmentResponse(BaseModel):
    id: int
    teacher_id: str
    teacher_name: Optional[str] = None
    class_id: int
    class_name: Optional[str] = None
    subject_id: int
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class TeacherClassAttendance(BaseModel):
    class_id: int
    class_name: str
    present: int
    absent: int
    recorded: int


class TeacherDashboardResponse(BaseModel):
    todays_classes: int
    total_students: int
    present_today: int
    absent_today: int
    attendance_rate: float
    schedule: List[ScheduleItem]
    attendance_by_class: List[TeacherClassAttendance] = Field(default_factory=list)


class AdminDashboardResponse(BaseModel):
    total_students: int
    total_teachers: int
    total_classes: int
    overall_attendance: float
    active_devices: int
    method_breakdown: dict


# ==============================================================================
# SYSTEM SETTINGS SCHEMAS
# ==============================================================================

class SystemSettingsResponse(BaseModel):
    college_name: str = "CampusSync University"
    college_short_name: str = "CampusSync"
    logo_url: Optional[str] = None
    academic_term: str = "Academic Session 2026"
    min_attendance_pct: int = 75
    late_threshold_minutes: int = 15
    session_timeout_minutes: int = 60
    dual_factor_required: bool = True
    support_email: str = "admin@campussync.edu"
    system_tagline: str = "Smart Multi-Modal Attendance & Campus Management System"


class SystemSettingsUpdate(BaseModel):
    college_name: Optional[str] = None
    college_short_name: Optional[str] = None
    academic_term: Optional[str] = None
    min_attendance_pct: Optional[int] = None
    late_threshold_minutes: Optional[int] = None
    session_timeout_minutes: Optional[int] = None
    dual_factor_required: Optional[bool] = None
    support_email: Optional[str] = None
    system_tagline: Optional[str] = None
