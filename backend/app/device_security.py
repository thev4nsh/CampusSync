"""Helpers for provisioning and authenticating attendance hardware."""
import hashlib
import hmac
import secrets


def generate_device_key() -> str:
    return secrets.token_urlsafe(32)


def hash_device_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def device_key_matches(key: str, stored_hash: str) -> bool:
    return hmac.compare_digest(hash_device_key(key), stored_hash)
