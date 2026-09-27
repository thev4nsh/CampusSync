from typing import List, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, UserRole, Student, Teacher
from app.security import decode_token

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
