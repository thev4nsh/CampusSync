"""
Department / batch resolution shared by the admin, teacher and student routers.

Departments are the single source of truth for the free-text ``department``
columns that already exist on classes, subjects, students and teachers. Every
write path funnels through :func:`resolve_department`, so a department typed
before departments were managed (or sent by an older client) is registered
instead of silently splitting reports into two spellings.
"""

from __future__ import annotations

import re
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import Batch, Class, Department

BRANDING_DIR = Path(__file__).resolve().parents[2] / "uploads" / "branding"
LOGO_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
MAX_LOGO_BYTES = 3 * 1024 * 1024


def clean_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def department_code_from_name(name: str) -> str:
    """Derive a short unique-ish code from a department name."""
    words = [word for word in re.split(r"[^A-Za-z0-9]+", name) if word]
    if not words:
        return "DEPT"
    if len(words) == 1:
        return words[0][:6].upper()
    acronym = "".join(word[0] for word in words).upper()
    return acronym[:8] if len(acronym) >= 2 else words[0][:6].upper()


def find_department(db: Session, value: str | None) -> Department | None:
    clean = clean_text(value)
    if not clean:
        return None
    return db.query(Department).filter(
        (Department.name.ilike(clean)) | (Department.code.ilike(clean))
    ).first()


def resolve_department(db: Session, value: str | None, *, required: bool = False) -> Department | None:
    """Return the department matching a name/code, registering unknown names.

    Keeps existing free-text department values working while the admin list
    stays the single, editable registry the UI offers as a dropdown.
    """
    clean = clean_text(value)
    if not clean:
        if required:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Choose a department. Add one from Admin → Departments first.",
            )
        return None

    existing = find_department(db, clean)
    if existing:
        return existing

    base_code = department_code_from_name(clean)
    code = base_code
    suffix = 2
    while db.query(Department.id).filter(Department.code.ilike(code)).first():
        code = f"{base_code[:6]}{suffix}"
        suffix += 1

    created = Department(code=code, name=clean)
    db.add(created)
    db.flush()
    return created


def department_name_for(db: Session, value: str | None) -> str:
    """Canonical department name for storage in a free-text column."""
    department = resolve_department(db, value)
    return department.name if department else clean_text(value) or "Computer Science & Engineering"


def resolve_batch(db: Session, batch_id: int | None, *, department: Department | None = None) -> Batch | None:
    if batch_id is None:
        return None
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Batch not found in this institution.")
    if department is not None and batch.department_id != department.id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="This batch belongs to a different department. Pick a matching batch.",
        )
    return batch


def find_class_for_student(
    db: Session,
    *,
    batch: Batch | None,
    section: str | None,
    department: str | None,
) -> Class | None:
    """The class section a student belongs to, given their batch (or department) and section.

    A student always belongs to a class when one exists, otherwise rosters, roll
    call and class reports would not see them. Never guesses across sections.
    """
    query = db.query(Class)
    if batch is not None:
        query = query.filter(Class.batch_id == batch.id)
    elif department:
        query = query.filter(Class.department.ilike(clean_text(department)))
    else:
        return None

    wanted = clean_text(section).upper()
    if wanted:
        return query.filter(Class.section.ilike(wanted)).first()
    # A class with no section split still owns the batch's students.
    return query.filter((Class.section == "") | (Class.section.is_(None))).first()


def batch_year_label(batch: Batch | None) -> str | None:
    """Human label used for the class 'year' column ('2024-2028' -> '2024-2028')."""
    return batch.name if batch else None


# ==============================================================================
# INSTITUTION LOGO
# ==============================================================================

def logo_file() -> Path | None:
    """The uploaded institution logo, if one exists."""
    for suffix in LOGO_EXTENSIONS:
        candidate = BRANDING_DIR / f"logo{suffix}"
        if candidate.is_file():
            return candidate
    return None


def logo_url() -> str | None:
    """Public logo URL with a cache-busting stamp so replacements show up at once."""
    path = logo_file()
    if not path:
        return None
    return f"/api/auth/institution/logo?v={int(path.stat().st_mtime)}"
