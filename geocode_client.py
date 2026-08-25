"""
Geocode Client Module (geocode_client.py)
Uses OpenStreetMap Nominatim reverse geocoding to resolve GPS coordinates
into user-friendly city, state, country, and formatted place labels.
"""

import logging
import requests

logger = logging.getLogger(__name__)


def reverse_geocode(lat: float, lon: float) -> dict:
    """
    Returns {'city': ..., 'state': ..., 'country': ..., 'label': ...} for the user's coordinates.
    Falls back gracefully to 'your location' if service is unreachable or rate-limited.
    """
    try:
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {"lat": lat, "lon": lon, "format": "jsonv2"}
        headers = {"User-Agent": "AI-Disaster-Response-Coordinator/1.0 (contact: info@eoc-response.gov)"}
        
        resp = requests.get(url, params=params, headers=headers, timeout=8)
        resp.raise_for_status()
        
        data = resp.json()
        addr = data.get("address", {})
        
        city = (
            addr.get("city")
            or addr.get("town")
            or addr.get("village")
            or addr.get("suburb")
            or addr.get("county")
            or addr.get("state_district")
        )
        state = addr.get("state")
        country = addr.get("country")
        
        # Build user-centric location label (e.g., "Coimbatore, Tamil Nadu, India")
        parts = [p for p in [city, state, country] if p]
        label = ", ".join(parts) if parts else "your location"
        
        return {
            "city": city,
            "state": state,
            "country": country,
            "label": label
        }
    except Exception as e:
        logger.warning(f"Reverse geocode failed for ({lat}, {lon}): {e}")
        return {
            "city": None,
            "state": None,
            "country": None,
            "label": "your location"
        }
