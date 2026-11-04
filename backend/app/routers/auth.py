from datetime import datetime, timedelta, timezone
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models import AuthSession, Institution, SystemSetting, User, Student, Teacher
from app.schemas import (
    LoginRequest,
    Token,
    UserResponse,
    ForgotPasswordRequest,
    RefreshTokenRequest,
    RefreshTokenResponse,
)
from app.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_refresh_token,
)
from app.dependencies import get_current_user, oauth2_scheme

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate user using institutional Email or Student/Teacher ID with password.
    Returns JWT access and refresh tokens along with user role and profile.
    """
    db.info.pop("institution_id", None)
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

    now = datetime.now(timezone.utc)
    session_id = str(uuid4())
    refresh_token = create_refresh_token(subject=user.id, session_id=session_id)
    auth_session = AuthSession(
        id=session_id,
        user_id=user.id,
        refresh_token_hash=hash_refresh_token(refresh_token),
        expires_at=now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        last_used_at=now,
    )
    db.add(auth_session)
    db.commit()
    access_token = create_access_token(subject=user.id, role=user.role.value, session_id=session_id)

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
def logout(
    current_user: User = Depends(get_current_user),
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    """
    Revoke active session token.
    """
    payload = decode_token(token) or {}
    session_id = payload.get("sid")
    if session_id:
        db.query(AuthSession).filter(
            AuthSession.id == session_id,
            AuthSession.user_id == current_user.id,
            AuthSession.revoked_at.is_(None),
        ).update({AuthSession.revoked_at: datetime.now(timezone.utc)}, synchronize_session=False)
        db.commit()
    return {"message": "This session has been signed out."}


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    """
    Initiate password recovery flow. Dispatches instructions if account is recognized.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Self-service password reset is not configured. Contact your college administrator.",
    )


@router.post("/refresh", response_model=RefreshTokenResponse)
def refresh_token_endpoint(body: RefreshTokenRequest, db: Session = Depends(get_db)):
    """
    Generate new access token from valid refresh token.
    """
    refresh_token = body.refresh_token

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    session_id = payload.get("sid")
    if not session_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    now = datetime.now(timezone.utc)
    previous_hash = hash_refresh_token(refresh_token)
    auth_session = db.query(AuthSession).filter(
        AuthSession.id == session_id,
        AuthSession.user_id == user.id,
        AuthSession.refresh_token_hash == previous_hash,
        AuthSession.revoked_at.is_(None),
        AuthSession.expires_at > now,
    ).first()
    if not auth_session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired, revoked, or already used")

    new_refresh = create_refresh_token(subject=user.id, session_id=session_id)
    updated = db.query(AuthSession).filter(
        AuthSession.id == session_id,
        AuthSession.refresh_token_hash == previous_hash,
        AuthSession.revoked_at.is_(None),
        AuthSession.expires_at > now,
    ).update({
        AuthSession.refresh_token_hash: hash_refresh_token(new_refresh),
        AuthSession.last_used_at: now,
    }, synchronize_session=False)
    if updated != 1:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token was already used")
    db.commit()

    return RefreshTokenResponse(
        access_token=create_access_token(subject=user.id, role=user.role.value, session_id=session_id),
        refresh_token=new_refresh,
    )


@router.get("/institution")
def get_public_institution_info(db: Session = Depends(get_db)):
    """Retrieve public branding for the configured first college."""
    db.info.pop("institution_id", None)
    institution = db.query(Institution).filter(Institution.id == 1, Institution.is_active.is_(True)).first()
    settings = db.query(SystemSetting).filter(SystemSetting.institution_id == 1).all()
    setting_map = {s.key: s.value for s in settings}

    return {
        "college_name": setting_map.get("college_name", institution.name if institution else "CampusSync University"),
        "college_short_name": setting_map.get("college_short_name", "CampusSync"),
        "academic_term": setting_map.get("academic_term", "Academic Session 2026"),
        "support_email": setting_map.get("support_email", "admin@campussync.edu"),
        "system_tagline": setting_map.get("system_tagline", "Smart Multi-Modal Attendance & Campus Management System"),
        "min_attendance_pct": int(setting_map.get("min_attendance_pct", "75")),
        "late_threshold_minutes": int(setting_map.get("late_threshold_minutes", "15")),
        "session_timeout_minutes": int(setting_map.get("session_timeout_minutes", "60")),
    }
