"""
Alerts Store Module (alerts_store.py)
In-memory store for Admin broadcast alerts sent to Field Users & Public.
"""

from itertools import count
from datetime import datetime, timedelta

_next_id = count(1)
ALERTS = []  # list of dicts


def add_alert(message: str, severity: str = "info", expires_in_minutes: int = 60) -> dict:
    """Adds a new broadcast alert to the in-memory store."""
    alert = {
        "id": next(_next_id),
        "message": message,
        "severity": severity,  # "critical" | "warning" | "info"
        "created_at": datetime.utcnow().isoformat(),
        "expires_at": (datetime.utcnow() + timedelta(minutes=expires_in_minutes)).isoformat(),
        "retracted": False,
    }
    ALERTS.append(alert)
    return alert


def list_active_alerts() -> list:
    """Returns currently active, non-expired, non-retracted broadcast alerts."""
    now = datetime.utcnow()
    return [
        a for a in ALERTS
        if not a["retracted"] and datetime.fromisoformat(a["expires_at"]) > now
    ]


def list_all_alerts() -> list:
    """Returns all alerts (active, expired, retracted) for Admin management UI."""
    return list(reversed(ALERTS))


def retract_alert(alert_id: int) -> bool:
    """Retracts an active broadcast alert by ID."""
    for a in ALERTS:
        if a["id"] == alert_id:
            a["retracted"] = True
            return True
    return False
