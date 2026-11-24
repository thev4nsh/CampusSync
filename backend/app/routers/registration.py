"""
Public student registration links and the admin approval queue.

An admin generates a link (one shareable token) and hands it to applicants. The
public form only offers the departments, batches and sections the admin already
created. Every submission waits in the admin portal until it is approved or
rejected with a reason, and the applicant can re-open the same link to see that
decision. No email is sent by CampusSync: the reason is stored so office staff
can read it when the student comes in.
"""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import require_admin
from app.models import (
    Batch,
    BiometricIdentity,
    Class,
    Department,
    Institution,
    RFIDCard,
    RegistrationLink,
    RegistrationRequest,
    RegistrationStatus,
    Student,
    SystemSetting,
    User,
    UserRole,
)
from app.schemas import (
    PublicRegistrationInfo,
    RegistrationBatchOption,
    RegistrationClassOption,
    RegistrationLinkCreate,
    RegistrationLinkResponse,
    RegistrationLinkUpdate,
    RegistrationReject,
    RegistrationRequestResponse,
    RegistrationStatusResponse,
    RegistrationSubmit,
)
from app.security import get_password_hash
from app.services.academics_service import clean_text, logo_url

router = APIRouter(tags=["Student Registration"])


# ==============================================================================
# HELPERS
# ==============================================================================

def _link_or_404(db: Session, token: str) -> RegistrationLink:
    """Resolve a public token and bind the session to that institution."""
    link = db.query(RegistrationLink).filter(RegistrationLink.token == token).first()
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This registration link is not valid.")
    # Every later query in this request is scoped to the link's institution.
    db.info["institution_id"] = link.institution_id
    return link


def _sections_by_batch(db: Session) -> dict:
    """Sections the admin has actually created, grouped by batch."""
    grouped: dict[int, List[str]] = {}
    for batch_id, section in db.query(Class.batch_id, Class.section).all():
        if batch_id is None:
            continue
        value = clean_text(section).upper()
        if value and value not in grouped.setdefault(batch_id, []):
            grouped[batch_id].append(value)
    for values in grouped.values():
        values.sort()
    return grouped


def _batch_options(db: Session) -> List[RegistrationBatchOption]:
    sections = _sections_by_batch(db)
    rows = db.query(Batch).order_by(Batch.name.desc()).all()
    return [
        RegistrationBatchOption(
            id=batch.id,
            name=batch.name,
            department_name=batch.department_obj.name if batch.department_obj else None,
            sections=sections.get(batch.id, []),
        )
        for batch in rows
    ]


def _class_options(db: Session) -> List[RegistrationClassOption]:
    """Classes created without an admission batch, grouped by their department."""
    rows = db.query(Class).filter(Class.batch_id.is_(None)).order_by(Class.name.asc()).all()
    options: List[RegistrationClassOption] = []
    for row in rows:
        department = clean_text(row.department)
        if not department:
            continue
        options.append(
            RegistrationClassOption(
                id=row.id,
                name=row.name,
                section=clean_text(row.section) or None,
                department_name=department,
            )
        )
    return options


def _department_options(db: Session) -> List[str]:
    """Every department created in the admin portal, with or without batches yet."""
    return [row.name for row in db.query(Department).order_by(Department.name.asc()).all()]


def _institution_branding(db: Session, institution_id: int) -> tuple[str, Optional[str]]:
    institution = db.query(Institution).filter(Institution.id == institution_id).first()
    full_name = institution.name if institution else "CampusSync"
    short_name = None
    for key in ("college_name", "college_short_name"):
        row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
        if not row or not row.value:
            continue
        if key == "college_name":
            full_name = row.value
        else:
            short_name = row.value
    return full_name, short_name


def _status_response(row: RegistrationRequest) -> RegistrationStatusResponse:
    return RegistrationStatusResponse(
        reference=row.id,
        name=row.name,
        status=row.status.value if hasattr(row.status, "value") else str(row.status),
        decision_reason=row.decision_reason,
        created_at=row.created_at,
        decided_at=row.decided_at,
    )


def _request_response(row: RegistrationRequest) -> RegistrationRequestResponse:
    return RegistrationRequestResponse(
        id=row.id,
        name=row.name,
        email=row.email,
        registration_number=row.registration_number,
        roll_number=row.roll_number,
        department=row.department,
        batch_id=row.batch_id,
        batch_name=row.batch_obj.name if row.batch_obj else row.batch_name,
        section=row.section,
        course=row.course,
        status=row.status.value if hasattr(row.status, "value") else str(row.status),
        decision_reason=row.decision_reason,
        student_id=row.student_id,
        link_label=row.link.label if row.link else None,
        created_at=row.created_at,
        decided_at=row.decided_at,
    )


def _link_response(row: RegistrationLink) -> RegistrationLinkResponse:
    requests = row.requests or []
    pending = [item for item in requests if item.status == RegistrationStatus.PENDING]
    return RegistrationLinkResponse(
        id=row.id,
        token=row.token,
        label=row.label,
        is_active=row.is_active,
        created_at=row.created_at,
        request_count=len(requests),
        pending_count=len(pending),
        path=f"/register/{row.token}",
    )


# ==============================================================================
# PUBLIC FORM
# ==============================================================================

@router.get("/registration/{token}", response_model=PublicRegistrationInfo)
def public_registration_form(token: str, db: Session = Depends(get_db)):
    """Branding and the admin-defined batches/sections for the public form."""
    link = _link_or_404(db, token)
    full_name, short_name = _institution_branding(db, link.institution_id)
    return PublicRegistrationInfo(
        institution_name=full_name,
        institution_short_name=short_name,
        logo_url=logo_url(),
        is_active=link.is_active,
        link_label=link.label,
        departments=_department_options(db) if link.is_active else [],
        batches=_batch_options(db) if link.is_active else [],
        standalone_classes=_class_options(db) if link.is_active else [],
        sections=[],
    )


@router.post(
    "/registration/{token}",
    response_model=RegistrationStatusResponse,
    status_code=status.HTTP_201_CREATED,
)
def submit_registration(token: str, payload: RegistrationSubmit, db: Session = Depends(get_db)):
    """Store one application for admin review. No account exists until approval."""
    link = _link_or_404(db, token)
    if not link.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This registration link is closed.")

    batch: Optional[Batch] = None
    standalone_class: Optional[Class] = None
    if payload.class_id is not None:
        standalone_class = db.query(Class).filter(Class.id == payload.class_id).first()
        if not standalone_class:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Choose a class from the list.")
        batch = standalone_class.batch_obj
    elif payload.batch_id is not None:
        batch = db.query(Batch).filter(Batch.id == payload.batch_id).first()
        if not batch:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Choose a batch from the list.")
    else:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Choose your batch.")

    chosen_department = clean_text(payload.department)
    batch_department = batch.department_obj.name if batch and batch.department_obj else None
    class_department = clean_text(standalone_class.department) if standalone_class else None
    effective_department = batch_department or class_department
    if chosen_department and effective_department and chosen_department.lower() != effective_department.lower():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Choose a batch that belongs to your department.",
        )

    if batch is not None:
        section = clean_text(payload.section).upper()
        allowed_sections = _sections_by_batch(db).get(batch.id, [])
        if allowed_sections and section not in allowed_sections:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Section must be one of: {', '.join(allowed_sections)}.",
            )
        if not allowed_sections:
            section = ""
        batch_id = batch.id
        batch_name = batch.name
    else:
        # A class created without an admission batch carries its own section.
        section = clean_text(standalone_class.section).upper()
        batch_id = None
        batch_name = standalone_class.name

    email = payload.email.strip().lower()
    registration_number = payload.registration_number.strip().upper()

    if db.query(User.id).filter(User.email.ilike(email)).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This email is already registered. Sign in instead.")
    if db.query(Student.id).filter(Student.id.ilike(registration_number)).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This registration number is already enrolled.")

    duplicate = (
        db.query(RegistrationRequest)
        .filter(
            RegistrationRequest.status == RegistrationStatus.PENDING,
            (
                RegistrationRequest.email.ilike(email)
                | RegistrationRequest.registration_number.ilike(registration_number)
            ),
        )
        .first()
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An application with this email or registration number is already waiting for review.",
        )

    department = effective_department or "Computer Science & Engineering"

    row = RegistrationRequest(
        id=str(uuid4()),
        link_id=link.id,
        name=clean_text(payload.name),
        email=email,
        hashed_password=get_password_hash(payload.password),
        registration_number=registration_number,
        roll_number=clean_text(payload.roll_number).upper(),
        department=department,
        batch_id=batch_id,
        batch_name=batch_name,
        section=section,
        course="B.Tech CSE",
        status=RegistrationStatus.PENDING,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _status_response(row)


@router.get("/registration/{token}/status/{reference}", response_model=RegistrationStatusResponse)
def registration_status(token: str, reference: str, db: Session = Depends(get_db)):
    """The applicant's own status page, including a rejection reason."""
    link = _link_or_404(db, token)
    row = db.query(RegistrationRequest).filter(
        RegistrationRequest.id == reference,
        RegistrationRequest.link_id == link.id,
    ).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    return _status_response(row)


# ==============================================================================
# ADMIN: LINKS
# ==============================================================================

@router.get("/admin/registration-links", response_model=List[RegistrationLinkResponse])
def list_registration_links(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = db.query(RegistrationLink).order_by(RegistrationLink.created_at.desc()).all()
    return [_link_response(row) for row in rows]


@router.post(
    "/admin/registration-links",
    response_model=RegistrationLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_registration_link(
    payload: RegistrationLinkCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = RegistrationLink(
        id=str(uuid4()),
        token=uuid4().hex,
        label=clean_text(payload.label) or "Student registration",
        is_active=True,
        created_by_id=current_user.id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _link_response(row)


@router.patch("/admin/registration-links/{link_id}", response_model=RegistrationLinkResponse)
def update_registration_link(
    link_id: str,
    payload: RegistrationLinkUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.query(RegistrationLink).filter(RegistrationLink.id == link_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration link not found.")
    if payload.label is not None:
        row.label = clean_text(payload.label) or row.label
    if payload.is_active is not None:
        row.is_active = payload.is_active
    db.commit()
    db.refresh(row)
    return _link_response(row)


@router.delete("/admin/registration-links/{link_id}")
def delete_registration_link(
    link_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.query(RegistrationLink).filter(RegistrationLink.id == link_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registration link not found.")
    db.delete(row)
    db.commit()
    return {"message": "Registration link deleted."}


# ==============================================================================
# ADMIN: APPLICATIONS
# ==============================================================================

@router.get("/admin/registration-requests", response_model=List[RegistrationRequestResponse])
def list_registration_requests(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(RegistrationRequest)
    if status_filter and status_filter.lower() in {"pending", "approved", "rejected"}:
        query = query.filter(RegistrationRequest.status == RegistrationStatus(status_filter.lower()))
    rows = query.order_by(RegistrationRequest.created_at.desc()).all()
    return [_request_response(row) for row in rows]


@router.post(
    "/admin/registration-requests/{request_id}/approve",
    response_model=RegistrationRequestResponse,
)
def approve_registration(
    request_id: str,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create the login account and student profile from an approved application."""
    row = db.query(RegistrationRequest).filter(RegistrationRequest.id == request_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    if row.status != RegistrationStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This application is already decided.")

    if db.query(User.id).filter(User.email.ilike(row.email)).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This email already has an account.")
    if db.query(Student.id).filter(Student.id.ilike(row.registration_number)).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This registration number is already enrolled.")

    batch = db.query(Batch).filter(Batch.id == row.batch_id).first() if row.batch_id else None
    target_class = None
    if batch and row.section:
        target_class = db.query(Class).filter(
            Class.batch_id == batch.id,
            Class.section.ilike(row.section),
        ).first()
    elif batch:
        # A batch with a single class (no section split) still owns its students.
        target_class = db.query(Class).filter(
            Class.batch_id == batch.id,
            (Class.section == "") | (Class.section.is_(None)),
        ).first()
    elif row.batch_name:
        # The applicant chose a class the admin created without a batch.
        target_class = db.query(Class).filter(
            Class.name.ilike(row.batch_name),
            Class.batch_id.is_(None),
        ).first()

    user = User(
        name=row.name,
        email=row.email,
        hashed_password=row.hashed_password,
        role=UserRole.STUDENT,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    student = Student(
        id=row.registration_number,
        user_id=user.id,
        class_id=target_class.id if target_class else None,
        batch_id=batch.id if batch else None,
        department=row.department,
        course=row.course,
        year=batch.name if batch else (target_class.name if target_class else "1st Year"),
        section=row.section or (clean_text(target_class.section) if target_class else "A"),
        roll_number=row.roll_number,
        phone=None,
    )
    db.add(student)
    db.add(RFIDCard(card_uid=f"RFID-{student.id}", student_id=student.id, is_active=True))
    db.add(BiometricIdentity(student_id=student.id, fingerprint_enrolled=False, face_enrolled=False))

    row.status = RegistrationStatus.APPROVED
    row.decided_at = datetime.now(timezone.utc)
    row.decided_by_id = current_user.id
    row.student_id = student.id
    db.commit()
    db.refresh(row)
    return _request_response(row)


@router.post(
    "/admin/registration-requests/{request_id}/reject",
    response_model=RegistrationRequestResponse,
)
def reject_registration(
    request_id: str,
    payload: RegistrationReject,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Reject an application and keep the reason for the applicant and the office."""
    row = db.query(RegistrationRequest).filter(RegistrationRequest.id == request_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found.")
    if row.status != RegistrationStatus.PENDING:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This application is already decided.")

    row.status = RegistrationStatus.REJECTED
    row.decision_reason = clean_text(payload.reason)
    row.decided_at = datetime.now(timezone.utc)
    row.decided_by_id = current_user.id
    db.commit()
    db.refresh(row)
    return _request_response(row)

