from typing import List, Optional, Generic, TypeVar, Any, Union
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from app.models import UserRole, AttendanceMethod, AttendanceStatus, DeviceType, SessionStatus

T = TypeVar("T")


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

class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email address or Student/Teacher ID")
    password: str = Field(..., min_length=4)


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

class ClassBase(BaseModel):
    name: str
    year: str = "3rd Year"
    section: str = "A"
    department: str = "Computer Science & Engineering"


class ClassCreate(ClassBase):
    pass


class ClassUpdate(BaseModel):
    name: Optional[str] = None
    year: Optional[str] = None
    section: Optional[str] = None
    department: Optional[str] = None


class ClassResponse(ClassBase):
    id: int
    created_at: datetime
    total_students: Optional[int] = None
    subjects: List[str] = []
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


# ==============================================================================
# STUDENT SCHEMAS
# ==============================================================================

class StudentBase(BaseModel):
    department: str = "Computer Science & Engineering"
    course: str = "B.Tech CSE"
    year: str = "3rd Year"
    section: str = "A"
    phone: Optional[str] = None


class StudentCreate(StudentBase):
    id: str = Field(..., description="Student ID e.g. CSE23001")
    name: str
    email: EmailStr
    password: Optional[str] = "Student@123"
    class_id: Optional[int] = None
    class_name: Optional[str] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    year: Optional[str] = None
    section: Optional[str] = None
    phone: Optional[str] = None
    class_id: Optional[int] = None
    class_name: Optional[str] = None


class BiometricsStatus(BaseModel):
    fingerprint: bool = False
    face: bool = False
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
    phone: Optional[str] = None
    attendance_percentage: Optional[float] = 0.0
    biometrics: Optional[BiometricsStatus] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


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
    password: Optional[str] = "Teacher@123"
    subjects: Optional[List[str]] = None


class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    department: Optional[str] = None
    phone: Optional[str] = None
    subjects: Optional[List[str]] = None


class TeacherResponse(BaseModel):
    id: str
    name: str
    email: EmailStr
    department: str
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


class TeacherDashboardResponse(BaseModel):
    todays_classes: int
    total_students: int
    present_today: int
    absent_today: int
    attendance_rate: float
    schedule: List[ScheduleItem]


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
