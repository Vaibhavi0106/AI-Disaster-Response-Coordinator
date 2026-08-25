"""
In-memory Authentication Store for Prototype Mode.
Swap this module for real DB-backed authentication later (e.g., SQLAlchemy User model);
nothing else in the application should need to change when you do.
"""

DEMO_ACCOUNTS = {
    "admin@eoc.gov": {"password": "admin123", "role": "admin", "name": "Admin Commander"},
    "user@eoc.gov":  {"password": "user123",  "role": "regular", "name": "Field User"},
}

def authenticate(email: str, password: str) -> dict | None:
    """
    Validates user credentials against hardcoded DEMO_ACCOUNTS.
    Returns dict containing email, role, and name if valid, else None.
    """
    account = DEMO_ACCOUNTS.get(str(email).strip().lower())
    if account and account["password"] == password:
        return {
            "email": email.strip().lower(),
            "role": account["role"],
            "name": account["name"]
        }
    return None
