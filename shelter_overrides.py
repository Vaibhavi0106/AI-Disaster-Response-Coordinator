"""
Shelter Overrides Module (shelter_overrides.py)
Stores in-memory admin overrides for live shelter capacity and operational status.
"""

from datetime import datetime

SHELTER_OVERRIDES = {}  # { shelter_name: {"status": ..., "capacity": ..., "updated_at": ...} }


def set_shelter_override(name: str, status: str, capacity: str) -> dict:
    """Sets or updates an in-memory capacity/status override for a shelter."""
    override_data = {
        "status": status,
        "capacity": capacity,
        "updated_at": datetime.utcnow().isoformat()
    }
    SHELTER_OVERRIDES[name] = override_data
    return override_data


def apply_shelter_overrides(shelters: list) -> list:
    """Applies active admin overrides to shelter list before returning disaster JSON."""
    if not isinstance(shelters, list):
        return shelters

    for s in shelters:
        if isinstance(s, dict) and s.get("name") in SHELTER_OVERRIDES:
            ov = SHELTER_OVERRIDES[s["name"]]
            if ov.get("status"):
                s["status"] = ov["status"]
            if ov.get("capacity"):
                s["capacity"] = ov["capacity"]
            s["admin_updated"] = True

    return shelters
