from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models import RFIDCard, BiometricIdentity, Device, Student


class DeviceService:
    """
    Service responsible for mapping physical device hardware signals (RFID UID,
    fingerprint template indices, facial embeddings) to enrolled Student identities.
    """

    @staticmethod
    def resolve_student_by_rfid(db: Session, rfid_uid: str) -> Student:
        """
        Maps physical RFID 13.56 MHz Card UID to enrolled Student.
        """
        clean_uid = rfid_uid.strip()
        card = db.query(RFIDCard).filter(
            RFIDCard.card_uid == clean_uid,
            RFIDCard.is_active.is_(True)
        ).first()

        if not card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unregistered or inactive RFID Smart Card UID: '{clean_uid}'."
            )

        return card.student

    @staticmethod
    def resolve_student_by_fingerprint(db: Session, template_id: str) -> Student:
        """
        Maps optical/capacitive sensor template index to enrolled Student.
        """
        clean_template = template_id.strip()
        bio = db.query(BiometricIdentity).filter(
            BiometricIdentity.fingerprint_template_id == clean_template,
            BiometricIdentity.fingerprint_enrolled.is_(True)
        ).first()

        if not bio:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Unregistered Fingerprint template ID: '{clean_template}'."
            )

        return bio.student

    @staticmethod
    def update_device_heartbeat(db: Session, device_id: str) -> Optional[Device]:
        """
        Updates last_seen timestamp for hardware terminal health auditing.
        """
        device = db.query(Device).filter(Device.id == device_id).first()
        if device:
            device.last_seen = datetime.now(timezone.utc)
            db.commit()
        return device


device_service = DeviceService()
