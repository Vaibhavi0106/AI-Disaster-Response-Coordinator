"""
In-memory SOS Alert Log Store for Prototype Mode.
Pure logging layer — does not affect delivery or dispatch in any way.
Swap this module for real DB-backed storage (e.g. SOSAlertLog model) later.
"""

from itertools import count
from datetime import datetime

_next_id = count(1)
SOS_LOG = []  # list of dicts, newest appended at the end — reset on restart


def log_sos_event(payload: dict, maps_url: str, delivered: bool, delivery_status: str) -> dict:
    """
    Appends a new SOS alert log record to in-memory SOS_LOG.
    """
    record = {
        "id": next(_next_id),
        "logged_at": datetime.utcnow().isoformat() + "Z",
        "name": payload.get("name", "Registered Emergency User"),
        "phone": payload.get("phone", "Not Provided"),
        "emergency_contact_name": payload.get("emergency_contact_name", "Emergency Contact"),
        "emergency_contact_phone": payload.get("emergency_contact_phone", "Not Provided"),
        "latitude": payload.get("latitude"),
        "longitude": payload.get("longitude"),
        "accuracy": payload.get("accuracy", "Unknown"),
        "timestamp": payload.get("timestamp", ""),
        "maps_url": maps_url,
        "delivered": delivered,              # True only on confirmed n8n success
        "delivery_status": delivery_status,  # "success" | "notification_not_configured" | "error"
        "admin_reviewed": False,             # admin housekeeping flag
    }
    SOS_LOG.append(record)
    return record


def list_sos_log() -> list:
    """
    Returns the SOS log ordered newest first.
    """
    return list(reversed(SOS_LOG))


def mark_sos_reviewed(sos_id: int) -> dict | None:
    """
    Marks a specific SOS alert as reviewed by an admin.
    """
    for r in SOS_LOG:
        if r["id"] == sos_id:
            r["admin_reviewed"] = True
            return r
    return None
