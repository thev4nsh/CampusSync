from typing import List
from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Device, DeviceType
from app.schemas import DeviceCreate, DeviceUpdate, DeviceResponse, DeviceStatusUpdate
from app.dependencies import require_admin, get_current_active_user

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.get("", response_model=List[DeviceResponse])
@router.get("/", response_model=List[DeviceResponse])
def list_devices(
    current_user = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """List all registered hardware device terminals with online/offline telemetry."""
    devices = db.query(Device).order_by(Device.created_at.desc()).all()
    results = []
    for d in devices:
        # Determine online status based on active flag and recent last_seen ping
        status_str = "Online" if d.is_active else "Offline"
        results.append(DeviceResponse(
            id=d.id,
            name=d.name,
            type=d.type,
            location=d.location,
            ip_address=d.ip_address,
            is_active=d.is_active,
            status=status_str,
            last_seen=d.last_seen,
            created_at=d.created_at
        ))
    return results


@router.post("", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def register_device(
    payload: DeviceCreate,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Register a new physical hardware terminal (RFID Reader, Fingerprint Scanner, or Face Camera)."""
    device_id = payload.id or f"DEV-{uuid.uuid4().hex[:4].upper()}"

    existing = db.query(Device).filter(Device.id == device_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Device with ID '{device_id}' already registered."
        )

    new_device = Device(
        id=device_id,
        name=payload.name,
        type=payload.type,
        location=payload.location,
        ip_address=payload.ip_address,
        is_active=payload.is_active,
        last_seen=datetime.now(timezone.utc)
    )

    db.add(new_device)
    db.commit()
    db.refresh(new_device)

    return DeviceResponse(
        id=new_device.id,
        name=new_device.name,
        type=new_device.type,
        location=new_device.location,
        ip_address=new_device.ip_address,
        is_active=new_device.is_active,
        status="Online" if new_device.is_active else "Offline",
        last_seen=new_device.last_seen,
        created_at=new_device.created_at
    )


@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(
    device_id: str,
    db: Session = Depends(get_db)
):
    """Get single device terminal telemetry."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

    return DeviceResponse(
        id=device.id,
        name=device.name,
        type=device.type,
        location=device.location,
        ip_address=device.ip_address,
        is_active=device.is_active,
        status="Online" if device.is_active else "Offline",
        last_seen=device.last_seen,
        created_at=device.created_at
    )


@router.put("/{device_id}/status")
def update_device_status(
    device_id: str,
    payload: DeviceStatusUpdate,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update active status of a hardware terminal."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

    is_online = payload.status.lower() == "online"
    device.is_active = is_online
    if is_online:
        device.last_seen = datetime.now(timezone.utc)
    db.commit()

    return {"message": f"Device status updated to {payload.status}", "id": device.id, "status": payload.status}


@router.delete("/{device_id}")
def delete_device(
    device_id: str,
    current_user = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """De-register a hardware terminal."""
    device = db.query(Device).filter(Device.id == device_id).first()
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")

    db.delete(device)
    db.commit()
    return {"message": f"Device '{device_id}' removed from network registry."}
