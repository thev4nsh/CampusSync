from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Student, Teacher
from app.schemas import (
    LoginRequest,
    Token,
    UserResponse,
    ForgotPasswordRequest,
    UserCreate
)
from app.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token
)
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user using institutional Email or Student/Teacher ID with password.
    Returns JWT access and refresh tokens along with user role and profile.
    """
    identifier = request.identifier.strip()
    user = None

    # 1. Try matching by Email directly
    user = db.query(User).filter(User.email.ilike(identifier)).first()

    # 2. If not found, try matching by Student ID
    if not user:
        student = db.query(Student).filter(Student.id.ilike(identifier)).first()
        if student:
            user = student.user

    # 3. If not found, try matching by Teacher ID
    if not user:
        teacher = db.query(Teacher).filter(Teacher.id.ilike(identifier)).first()
        if teacher:
            user = teacher.user

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your ID/Email and password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact the administrator."
        )

    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please verify your ID/Email and password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=user.id, role=user.role.value)
    refresh_token = create_refresh_token(subject=user.id)

    # Attach profile-specific identifiers if applicable
    user_dict = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value,
        "is_active": user.is_active,
        "created_at": user.created_at
    }

    if user.role.value == "student" and user.student_profile:
        user_dict["student_id"] = user.student_profile.id
        user_dict["class_name"] = user.student_profile.class_obj.name if user.student_profile.class_obj else None
    elif user.role.value == "teacher" and user.teacher_profile:
        user_dict["teacher_id"] = user.teacher_profile.id
        user_dict["department"] = user.teacher_profile.department

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "role": user.role.value,
        "user": user_dict
    }


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Retrieve authenticated user profile and active permission role.
    """
    return current_user


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    """
    Revoke active session token.
    """
    return {"message": "Logged out successfully."}


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Initiate password recovery flow. Dispatches instructions if account is recognized.
    """
    identifier = request.identifier.strip()
    user = db.query(User).filter(User.email.ilike(identifier)).first()
    if not user:
        student = db.query(Student).filter(Student.id.ilike(identifier)).first()
        if student:
            user = student.user
    if not user:
        teacher = db.query(Teacher).filter(Teacher.id.ilike(identifier)).first()
        if teacher:
            user = teacher.user

    # Always return a success response to prevent username enumeration
    return {
        "message": f"If an account matching '{identifier}' exists, password reset instructions have been dispatched."
    }


@router.post("/refresh")
def refresh_token_endpoint(body: dict, db: Session = Depends(get_db)):
    """
    Generate new access token from valid refresh token.
    """
    refresh_token = body.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing refresh_token")

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    new_access_token = create_access_token(subject=user.id, role=user.role.value)
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }


@router.get("/institution")
def get_public_institution_info(db: Session = Depends(get_db)):
    """Retrieve public college name and system branding without authentication."""
    from app.models import SystemSetting
    settings = db.query(SystemSetting).all()
    setting_map = {s.key: s.value for s in settings}

    return {
        "college_name": setting_map.get("college_name", "CampusSync University"),
        "college_short_name": setting_map.get("college_short_name", "CampusSync"),
        "academic_term": setting_map.get("academic_term", "Academic Session 2026"),
        "support_email": setting_map.get("support_email", "admin@campussync.edu"),
        "system_tagline": setting_map.get("system_tagline", "Smart Multi-Modal Attendance & Campus Management System"),
        "min_attendance_pct": int(setting_map.get("min_attendance_pct", "75")),
        "late_threshold_minutes": int(setting_map.get("late_threshold_minutes", "15")),
        "session_timeout_minutes": int(setting_map.get("session_timeout_minutes", "60")),
    }
