def test_admin_provisions_and_rotates_device_key(client, db, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    created = client.post("/api/devices", json={
        "name": "Library RFID reader",
        "type": "RFID",
        "location": "Library entrance",
        "is_active": True,
    }, headers=headers)
    assert created.status_code == 201, created.text
    device_id = created.json()["id"]

    first = client.post(f"/api/devices/{device_id}/credential", headers=headers)
    assert first.status_code == 200, first.text
    first_key = first.json()["api_key"]
    assert len(first_key) >= 40

    from app.models import Device
    device = db.query(Device).filter(Device.id == device_id).one()
    first_hash = device.api_key_hash
    assert first_key != first_hash

    second = client.post(f"/api/devices/{device_id}/credential", headers=headers)
    assert second.status_code == 200
    assert second.json()["api_key"] != first_key
    assert device.api_key_hash != first_hash

    listed = client.get("/api/devices", headers=headers)
    assert listed.status_code == 200
    assert all("api_key" not in item and "api_key_hash" not in item for item in listed.json())

    disabled = client.put(f"/api/devices/{device_id}/status", json={"status": "offline"}, headers=headers)
    assert disabled.status_code == 200
    assert device.api_key_hash is None
