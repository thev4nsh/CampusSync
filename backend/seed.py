"""
CampusSync Optional Database Seeder Script
Execute explicitly only when initial administrative account or development entities are desired.
Usage:
    python seed.py --admin-email admin@campussync.edu --admin-password AdminPassword123!
    python seed.py --init-all
"""

import sys
import argparse
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import User, UserRole, Class, Subject, Teacher, Student, RFIDCard, BiometricIdentity, Device, DeviceType, SystemSetting
from app.security import get_password_hash


def seed_admin(db: Session, email: str = "admin@campussync.edu", password: str = "Admin@123"):
    """Create master institutional administrator account if not present."""
    existing = db.query(User).filter(User.email.ilike(email)).first()
    if existing:
        print(f"[INFO] Admin user '{email}' already exists.")
        return existing

    admin = User(
        name="System Administrator",
        email=email,
        hashed_password=get_password_hash(password),
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    print(f"[SUCCESS] Created System Administrator account: {email}")
    return admin


def seed_sample_academic(db: Session):
    """Seed initial academic structure (Classes, Subjects, Devices)."""
    # 1. Classes
    classes_data = [
        {"name": "CSE-3A", "year": "3rd Year", "section": "A", "department": "Computer Science & Engineering"},
        {"name": "CSE-3B", "year": "3rd Year", "section": "B", "department": "Computer Science & Engineering"},
        {"name": "IT-3A", "year": "3rd Year", "section": "A", "department": "Information Technology"},
    ]
    for c in classes_data:
        if not db.query(Class).filter(Class.name == c["name"]).first():
            db.add(Class(**c))

    # 2. Subjects
    subjects_data = [
        {"code": "ECC502", "name": "Microprocessor and Microcontroller", "department": "Computer Science & Engineering"},
        {"code": "CSC511", "name": "Compiler Design", "department": "Computer Science & Engineering"},
        {"code": "CSC502", "name": "Artificial Intelligence", "department": "Computer Science & Engineering"},
    ]
    for s in subjects_data:
        if not db.query(Subject).filter(Subject.code == s["code"]).first():
            db.add(Subject(**s))

    # 3. Terminal Devices
    devices_data = [
        {"id": "DEV-RFID-01", "name": "Main Entrance RFID Gate 1", "type": DeviceType.RFID, "location": "Academic Block Gate A", "ip_address": "192.168.1.101"},
        {"id": "DEV-FP-01", "name": "CSE Lab 301 Fingerprint Terminal", "type": DeviceType.FINGERPRINT, "location": "Lab 301", "ip_address": "192.168.1.102"},
        {"id": "DEV-CAM-01", "name": "Seminar Hall AI Camera Scanner", "type": DeviceType.FACE_CAMERA, "location": "Seminar Hall", "ip_address": "192.168.1.103"},
    ]
    for d in devices_data:
        if not db.query(Device).filter(Device.id == d["id"]).first():
            db.add(Device(**d))

    # 4. Settings
    default_settings = [
        ("college_name", "Indian Institute of Technology , kalyani"),
        ("min_attendance_pct", "75"),
        ("late_threshold_minutes", "15"),
        ("session_timeout_minutes", "60"),
        ("dual_factor_required", "true")
    ]
    for key, val in default_settings:
        if not db.query(SystemSetting).filter(SystemSetting.key == key).first():
            db.add(SystemSetting(key=key, value=val))

    db.commit()
    print("[SUCCESS] Seeded foundational classes, subjects, device terminals, and settings.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CampusSync Database Seeder")
    parser.add_argument("--init-admin", action="store_true", help="Create default admin account")
    parser.add_argument("--admin-email", default="admin@campussync.edu", help="Admin email")
    parser.add_argument("--admin-password", default="Admin@123", help="Admin password")
    parser.add_argument("--init-all", action="store_true", help="Seed admin + academic structure")

    args = parser.parse_args()

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        if args.init_all:
            seed_admin(db, args.admin_email, args.admin_password)
            seed_sample_academic(db)
        elif args.init_admin:
            seed_admin(db, args.admin_email, args.admin_password)
        else:
            print("Please specify --init-admin or --init-all. Run with -h for help.")
    finally:
        db.close()
