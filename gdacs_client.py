"""
GDACS Client Module (gdacs_client.py)
Queries UN/EU Global Disaster Alert and Coordination System (GDACS) API
for real, currently-active global disasters within a specified radius.
Splits GDACS country strings into primary_country and clean countries list.
"""

import time
import math
import logging
import requests

logger = logging.getLogger(__name__)

GDACS_API_URL = "https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH"
_cache = {"events": None, "fetched_at": 0}
CACHE_TTL_SECONDS = 600  # 10 minutes cache

EVENT_TYPE_LABELS = {
    "EQ": "Earthquake",
    "TC": "Tropical Cyclone",
    "FL": "Flood",
    "WF": "Wildfire",
    "DR": "Drought",
    "VO": "Volcanic Activity",
    "TS": "Tsunami",
}


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS points in kilometers."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _fetch_active_events() -> list:
    """Fetches active features from GDACS API with 10-minute in-memory caching."""
    now = time.time()
    if _cache["events"] is not None and (now - _cache["fetched_at"]) < CACHE_TTL_SECONDS:
        return _cache["events"]

    try:
        resp = requests.get(
            GDACS_API_URL,
            timeout=10,
            headers={"User-Agent": "AI-Disaster-Response-Coordinator/1.0"}
        )
        resp.raise_for_status()
        geojson = resp.json()
        events = geojson.get("features", [])
        _cache["events"] = events
        _cache["fetched_at"] = now
        logger.info(f"Fetched {len(events)} active events from GDACS global API.")
        return events
    except Exception as e:
        logger.error(f"GDACS API fetch failed: {e}")
        if _cache["events"] is not None:
            return _cache["events"]
        raise RuntimeError(f"Could not reach the global disaster monitor right now: {str(e)}")


def find_nearby_disasters(lat: float, lon: float, radius_km: float = 500.0, max_results: int = 3) -> list:
    """
    Returns active GDACS events within radius_km of given coordinates, nearest first.
    Splits multi-country GDACS strings into clean primary_country and countries array.
    """
    events = _fetch_active_events()
    scored = []

    for ev in events:
        try:
            props = ev.get("properties") or ev
            coords = ev.get("geometry", {}).get("coordinates")
            if not coords or len(coords) < 2:
                ev_lon = float(props.get("longitude", 0))
                ev_lat = float(props.get("latitude", 0))
            else:
                ev_lon = float(coords[0])
                ev_lat = float(coords[1])

            dist = _haversine_km(lat, lon, ev_lat, ev_lon)
            if dist <= radius_km:
                scored.append((dist, props, ev_lat, ev_lon))
        except (TypeError, IndexError, ValueError, KeyError):
            continue

    alert_weights = {"Red": 0, "Orange": 1, "Green": 2}
    scored.sort(key=lambda x: (x[0], alert_weights.get(x[1].get("alertlevel"), 3)))

    results = []
    for dist, props, ev_lat, ev_lon in scored[:max_results]:
        sev_data = props.get("severitydata", {})
        sev_text = props.get("severitytext") or (sev_data.get("severitytext") if isinstance(sev_data, dict) else "")

        raw_country = props.get("country") or props.get("name") or ""
        countries = [c.strip() for c in raw_country.split(",") if c.strip()]
        primary_country = countries[0] if countries else (props.get("name") or "Unknown")

        results.append({
            "event_type": EVENT_TYPE_LABELS.get(props.get("eventtype"), props.get("eventtype")),
            "event_type_code": props.get("eventtype"),
            "alert_level": props.get("alertlevel", "Green"),
            "country": primary_country,
            "primary_country": primary_country,
            "countries": countries,
            "raw_gdacs_country": raw_country,
            "event_name": props.get("name") or props.get("eventname") or props.get("description") or "Disaster Event",
            "severity_text": sev_text,
            "from_date": props.get("fromdate"),
            "to_date": props.get("todate"),
            "eventid": props.get("eventid"),
            "latitude": ev_lat,
            "longitude": ev_lon,
            "event_lat": ev_lat,
            "event_lon": ev_lon,
            "distance_km": round(dist, 1),
        })

    return results
