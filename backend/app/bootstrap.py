"""
Idempotent academic-structure bootstrap.

Databases created before departments and batches were admin-managed already
store a free-text department on classes, subjects, students and teachers. This
module registers those values as real departments, turns each class year into a
batch for its department, and links students to their class batch.

Safe to run repeatedly:

    python -m app.bootstrap
"""

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import Batch, Class, Department, Institution, Student, Subject, Teacher
from app.services.academics_service import department_code_from_name


def ensure_columns() -> None:
    """Add the nullable batch link columns to databases created before batches."""
    if not settings.DATABASE_URL.startswith("sqlite"):
        # PostgreSQL deployments get these columns from Alembic instead.
        return
    with engine.begin() as conn:
        for table in ("classes", "students"):
            columns = [row[1] for row in conn.exec_driver_sql(f"PRAGMA table_info({table})")]
            if "batch_id" not in columns:
                conn.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN batch_id INTEGER")
        student_columns = [row[1] for row in conn.exec_driver_sql("PRAGMA table_info(students)")]
        if "roll_number" not in student_columns:
            conn.exec_driver_sql("ALTER TABLE students ADD COLUMN roll_number VARCHAR(30)")
        teacher_columns = [row[1] for row in conn.exec_driver_sql("PRAGMA table_info(teachers)")]
        if "extra_departments" not in teacher_columns:
            conn.exec_driver_sql("ALTER TABLE teachers ADD COLUMN extra_departments VARCHAR(400)")


def _unique_code(db, name: str) -> str:
    base = department_code_from_name(name)
    code = base
    suffix = 2
    while db.query(Department.id).filter(Department.code.ilike(code)).first():
        code = f"{base[:6]}{suffix}"
        suffix += 1
    return code


def backfill_academics(db) -> None:
    institution = db.query(Institution).order_by(Institution.id.asc()).first()
    if not institution:
        return
    db.info["institution_id"] = institution.id

    # 1. Free-text departments become managed departments.
    names: set[str] = set()
    for model in (Class, Subject, Student, Teacher):
        for (value,) in db.query(model.department).distinct():
            if value and value.strip():
                names.add(value.strip())

    for name in sorted(names):
        if not db.query(Department).filter(Department.name.ilike(name)).first():
            db.add(Department(code=_unique_code(db, name), name=name))
    db.commit()

    # 2. Each class year becomes a batch of that department.
    for cls in db.query(Class).filter(Class.batch_id.is_(None)).all():
        label = (cls.year or "").strip()
        department = db.query(Department).filter(Department.name.ilike(cls.department)).first()
        if not department or not label:
            continue
        batch = db.query(Batch).filter(
            Batch.department_id == department.id, Batch.name.ilike(label)
        ).first()
        if not batch:
            batch = Batch(name=label, department_id=department.id)
            db.add(batch)
            db.commit()
            db.refresh(batch)
        cls.batch_id = batch.id
    db.commit()

    # 3. Students inherit their class batch.
    for student in db.query(Student).filter(Student.batch_id.is_(None)).all():
        if student.class_obj and student.class_obj.batch_id:
            student.batch_id = student.class_obj.batch_id
    db.commit()

    # 4. Students without a class join the matching section of their batch (or department).
    for student in db.query(Student).filter(Student.class_id.is_(None)).all():
        query = db.query(Class)
        if student.batch_id:
            query = query.filter(Class.batch_id == student.batch_id)
        elif student.department:
            query = query.filter(Class.department.ilike(student.department))
        else:
            continue
        matched = None
        if (student.section or "").strip():
            matched = query.filter(Class.section.ilike(student.section.strip())).first()
        if not matched:
            matched = query.filter((Class.section == "") | (Class.section.is_(None))).first()
        if matched:
            student.class_id = matched.id
    db.commit()


def run() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_columns()
    db = SessionLocal()
    try:
        backfill_academics(db)
    finally:
        db.close()


if __name__ == "__main__":
    run()
    print("Academic structure bootstrap complete.")
