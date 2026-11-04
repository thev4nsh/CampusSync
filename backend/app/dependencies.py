from typing import List, Optional
from datetime import datetime, timezone
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AuthSession, Device, Institution, User, UserRole, Student, Teacher
from app.security import decode_token
from app.device_security import device_key_matches

# OAuth2 scheme - allows Bearer token in Authorization header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Extract and validate the JWT Bearer token and return the User instance.
    Raises HTTP 401 if missing or invalid.
    """
    db.info.pop("institution_id", None)
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or session expired.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not token:
        raise credentials_exception

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise credentials_exception

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise credentials_exception

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account."
        )

    institution = db.query(Institution).filter(Institution.id == user.institution_id).first()
    if not institution or not institution.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Institution account is inactive.")
    db.info["institution_id"] = institution.id

    session_id = payload.get("sid")
    if not session_id or not db.query(AuthSession.id).filter(
        AuthSession.id == session_id,
        AuthSession.user_id == user.id,
        AuthSession.revoked_at.is_(None),
        AuthSession.expires_at > datetime.now(timezone.utc),
    ).first():
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure current user is active."""
    return current_user


class RoleChecker:
    """Dependency for Role-Based Access Control (RBAC)."""
    def __init__(self, allowed_roles: List[UserRole]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_active_user)) -> User:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of [{', '.join(r.value for r in self.allowed_roles)}] role."
            )
        return user


# Role-specific dependency instances
require_admin = RoleChecker([UserRole.ADMIN])
require_teacher = RoleChecker([UserRole.TEACHER, UserRole.ADMIN])
require_student = RoleChecker([UserRole.STUDENT, UserRole.ADMIN])


def get_authenticated_device(
    x_device_id: Optional[str] = Header(default=None, alias="X-Device-ID"),
    x_device_key: Optional[str] = Header(default=None, alias="X-Device-Key"),
    db: Session = Depends(get_db),
) -> Device:
    """Authenticate an active hardware terminal using its one-time-provisioned key."""
    db.info.pop("institution_id", None)
    if not x_device_id or not x_device_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Device credentials are required.")

    device = db.query(Device).filter(Device.id == x_device_id, Device.is_active.is_(True)).first()
    if not device or not device.api_key_hash or not device_key_matches(x_device_key, device.api_key_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid device credentials.")
    institution = db.query(Institution).filter(Institution.id == device.institution_id).first()
    if not institution or not institution.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Institution account is inactive.")
    db.info["institution_id"] = institution.id
    return device


async def get_current_student(
    user: User = Depends(RoleChecker([UserRole.STUDENT])),
    db: Session = Depends(get_db)
) -> Student:
    """Retrieve the Student profile linked to the authenticated user."""
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found for this user account."
        )
    return student


async def get_current_teacher(
    user: User = Depends(RoleChecker([UserRole.TEACHER])),
    db: Session = Depends(get_db)
) -> Teacher:
    """Retrieve the Teacher profile linked to the authenticated user."""
    teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Teacher profile not found for this faculty user account."
        )
    return teacher
