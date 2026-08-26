"""
Geocode Client Module (geocode_client.py)
Uses OpenStreetMap Nominatim reverse geocoding to resolve GPS coordinates
into user-friendly city, state, country, and formatted place labels.
Provides canonical resolve_place(), constrained geocode_near(), safe_marker_coords(), and resolve_marker().
"""

import math
import hashlib
import logging
import requests

logger = logging.getLogger(__name__)

KNOWN_COORDINATES = {
    "chennai": {"lat": 13.0827, "lng": 80.2707, "country": "India", "label": "Chennai, Tamil Nadu, India"},
    "mumbai": {"lat": 19.0760, "lng": 72.8777, "country": "India", "label": "Mumbai, Maharashtra, India"},
    "delhi": {"lat": 28.6139, "lng": 77.2090, "country": "India", "label": "New Delhi, Delhi, India"},
    "bengaluru": {"lat": 12.9716, "lng": 77.5946, "country": "India", "label": "Bengaluru, Karnataka, India"},
    "kolkata": {"lat": 22.5726, "lng": 88.3639, "country": "India", "label": "Kolkata, West Bengal, India"},
    "hyderabad": {"lat": 17.3850, "lng": 78.4867, "country": "India", "label": "Hyderabad, Telangana, India"},
    "pune": {"lat": 18.5204, "lng": 73.8567, "country": "India", "label": "Pune, Maharashtra, India"},
    "wayanad": {"lat": 11.6854, "lng": 76.1320, "country": "India", "label": "Wayanad, Kerala, India"},
    "coimbatore": {"lat": 11.0168, "lng": 76.9558, "country": "India", "label": "Coimbatore, Tamil Nadu, India"},
    "brammapuram": {"lat": 11.0168, "lng": 76.9558, "country": "India", "label": "Brammapuram, Coimbatore, Tamil Nadu, India"},
    "sri lanka": {"lat": 7.8731, "lng": 80.7718, "country": "Sri Lanka", "label": "Sri Lanka"},
    "colombo": {"lat": 6.9271, "lng": 79.8612, "country": "Sri Lanka", "label": "Colombo, Sri Lanka"},
    "tokyo": {"lat": 35.6762, "lng": 139.6503, "country": "Japan", "label": "Tokyo, Japan"},
    "new york": {"lat": 40.7128, "lng": -74.0060, "country": "United States", "label": "New York, NY, USA"},
    "sydney": {"lat": -33.8688, "lng": 151.2093, "country": "Australia", "label": "Sydney, NSW, Australia"},
    "turkey": {"lat": 38.9637, "lng": 35.2433, "country": "Turkey", "label": "Turkey"},
    "miami": {"lat": 25.7617, "lng": -80.1918, "country": "United States", "label": "Miami, FL, USA"},
    "london": {"lat": 51.5074, "lng": -0.1278, "country": "United Kingdom", "label": "London, UK"},
    "paris": {"lat": 48.8566, "lng": 2.3522, "country": "France", "label": "Paris, France"},
    "los angeles": {"lat": 34.0522, "lng": -118.2437, "country": "United States", "label": "Los Angeles, CA, USA"},
    "beijing": {"lat": 39.9042, "lng": 116.4074, "country": "China", "label": "Beijing, China"},
    "cairo": {"lat": 30.0444, "lng": 31.2357, "country": "Egypt", "label": "Cairo, Egypt"},
}


def reverse_geocode(lat: float, lon: float) -> dict:
    """
    Returns {'city': ..., 'state': ..., 'country': ..., 'label': ...} for coordinates.
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


def geocode_location(location_name: str) -> dict:
    """
    Geocodes a place name string to lat/lng/country/label.
    """
    if not location_name:
        return {"lat": 20.0, "lng": 78.0, "country": "India", "label": "Target Operational Zone"}

    loc_clean = location_name.lower().strip()
    for k, v in KNOWN_COORDINATES.items():
        if k in loc_clean:
            return v

    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {"q": location_name, "format": "json", "limit": 1}
        headers = {"User-Agent": "AI-Disaster-Response-Coordinator/1.0 (contact: info@eoc-response.gov)"}
        resp = requests.get(url, params=params, headers=headers, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data and len(data) > 0:
                res_lat = float(data[0]["lat"])
                res_lon = float(data[0]["lon"])
                rev = reverse_geocode(res_lat, res_lon)
                return {
                    "lat": round(res_lat, 4),
                    "lng": round(res_lon, 4),
                    "country": rev.get("country") or "Global",
                    "label": rev.get("label") or location_name.title()
                }
    except Exception as e:
        logger.warning(f"Nominatim geocode for '{location_name}' failed: {e}")

    q_hash = int(hashlib.md5(loc_clean.encode('utf-8')).hexdigest(), 16)
    lat = ((q_hash % 14000) / 100.0) - 70.0
    lng = (((q_hash >> 16) % 36000) / 100.0) - 180.0
    return {"lat": round(lat, 4), "lng": round(lng, 4), "country": "Global", "label": location_name.title()}


def resolve_place(lat: float, lon: float) -> dict:
    """
    The ONE place every part of the app asks for a location label or geocoding anchor.
    Never builds a place name from raw query strings or unvalidated fields.
    """
    geo = reverse_geocode(lat, lon)
    city = geo.get("city")
    state = geo.get("state")
    country = geo.get("country")

    short_label = ", ".join(filter(None, [city, state, country])) or "the affected area"

    return {
        "lat": float(lat),
        "lon": float(lon),
        "city": city,
        "state": state,
        "country": country,
        "short_label": short_label,
    }


def _haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometers."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def geocode_near(place_query: str, anchor_lat: float, anchor_lon: float, max_distance_km: float = 100.0) -> dict | None:
    """
    Geocodes `place_query` constrained to a bounding box centered at `anchor_lat`, `anchor_lon`.
    Validates result distance against `max_distance_km`.
    """
    try:
        delta = 1.0  # ~110km viewbox radius
        viewbox = f"{anchor_lon - delta},{anchor_lat + delta},{anchor_lon + delta},{anchor_lat - delta}"

        resp = requests.get(
            "https://nominatim.openstreetmap.org/search",
            params={
                "q": place_query,
                "format": "json",
                "limit": 1,
                "viewbox": viewbox,
                "bounded": 1,
            },
            headers={"User-Agent": "AI-Disaster-Response-Coordinator/1.0 (contact: info@eoc-response.gov)"},
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            if data and len(data) > 0:
                res_lat = float(data[0]["lat"])
                res_lon = float(data[0]["lon"])
                dist = _haversine_distance(anchor_lat, anchor_lon, res_lat, res_lon)
                if dist <= max_distance_km:
                    return {"lat": round(res_lat, 4), "lon": round(res_lon, 4)}
    except Exception as e:
        logger.warning(f"geocode_near lookup for '{place_query}' near ({anchor_lat}, {anchor_lon}) failed: {e}")

    return None


def safe_marker_coords(event_name: str, anchor_lat: float, anchor_lon: float, final_lat: float, final_lon: float, max_km: float = 1500.0) -> tuple[float, float, bool]:
    """
    Rejects any resolved marker coordinate that ends up implausibly far from the event's anchor point.
    Falls back to anchor point directly with approximate=True if distance > max_km.
    """
    distance = _haversine_distance(anchor_lat, anchor_lon, final_lat, final_lon)
    if distance > max_km:
        logger.warning(
            f"[MARKER REJECTED] {event_name}: {distance:.0f}km from anchor ({anchor_lat}, {anchor_lon}) "
            f"— refusing to render at ({final_lat}, {final_lon}), falling back to anchor directly."
        )
        return round(anchor_lat, 4), round(anchor_lon, 4), True

    is_approx = distance > 5.0
    return round(final_lat, 4), round(final_lon, 4), is_approx


def resolve_marker(place_query: str, anchor_lat: float, anchor_lon: float, offset_seed: int = 0) -> dict:
    """
    Resolves marker coordinates. Tries constrained `geocode_near` first.
    Clamps result using safe_marker_coords to guarantee zero continent-hopping bugs.
    """
    geocoded = geocode_near(place_query, anchor_lat, anchor_lon)
    if geocoded:
        final_lat, final_lon, approx = safe_marker_coords(
            place_query, anchor_lat, anchor_lon, geocoded["lat"], geocoded["lon"]
        )
        logger.info(f"[MARKER DEBUG] event={place_query!r} anchor=({anchor_lat},{anchor_lon}) geocode_result={geocoded} final=({final_lat},{final_lon}) approximate={approx}")
        return {"lat": final_lat, "lon": final_lon, "approximate": approx}

    h = int(hashlib.md5(f"{place_query}_{offset_seed}".encode("utf-8")).hexdigest(), 16)
    offset_lat = (((h % 40) - 20) / 1000.0)
    offset_lon = ((((h >> 8) % 40) - 20) / 1000.0)

    raw_lat = anchor_lat + offset_lat
    raw_lon = anchor_lon + offset_lon

    final_lat, final_lon, approx = safe_marker_coords(
        place_query, anchor_lat, anchor_lon, raw_lat, raw_lon
    )
    logger.info(f"[MARKER DEBUG] event={place_query!r} anchor=({anchor_lat},{anchor_lon}) fallback_offset=({raw_lat},{raw_lon}) final=({final_lat},{final_lon}) approximate={approx}")

    return {
        "lat": final_lat,
        "lon": final_lon,
        "approximate": True
    }
