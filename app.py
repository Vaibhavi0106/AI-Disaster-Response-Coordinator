import os
import tempfile
import logging
from functools import wraps
from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for
from config import Config
from agents.disaster_agent import DisasterAgent
from agents.report_agent import ReportAgent
from auth_store import authenticate
from sos_store import log_sos_event, list_sos_log, mark_sos_reviewed
from gdacs_client import find_nearby_disasters
from shelter_overrides import set_shelter_override, apply_shelter_overrides
from alerts_store import add_alert, list_active_alerts, list_all_alerts, retract_alert
from geocode_client import reverse_geocode, resolve_place, geocode_location


# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("AppEngine")

# Initialize Flask Application
app = Flask(__name__)
app.config.from_object(Config)
app.secret_key = Config.SECRET_KEY

# Instantiate AI Agents
disaster_agent = DisasterAgent()
report_agent = ReportAgent()


def role_required(required_role: str):
    """Decorator to enforce server-side role-based access control."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = session.get("user")
            if not user or user.get("role") != required_role:
                return jsonify({
                    "status": "error",
                    "message": f"Access denied. Requires '{required_role}' authorization."
                }), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def filter_for_role(disaster_json: dict, role: str) -> dict:
    """
    Sanitizes structured disaster JSON output based on user role before sending to client.
    Admins receive full telemetry. Regular/public users receive only public-safety fields.
    """
    if role == "admin":
        return disaster_json

    # Regular / public view — strip everything not in the allowed set.
    brief = disaster_json.get("executive_command_brief", {})
    public_advisory = brief.get("advisory", "") if isinstance(brief, dict) else ""

    allowed_keys = {
        "disaster_type", "summary", "severity", "affected_locations",
        "recommended_resources_public", "safety_measures", "evacuation_shelters",
        "sources_public", "weather_metrics", "impact_radius", "emergency_contacts",
        "gdacs_verified", "gdacs_event_type", "gdacs_alert_level", "gdacs_distance_km",
        "gdacs_event_location", "gdacs_source_url", "countries", "primary_country"
    }

    filtered = {k: v for k, v in disaster_json.items() if k in allowed_keys}

    if public_advisory:
        filtered["public_advisory"] = public_advisory

    if "sources" in disaster_json and "sources_public" not in filtered:
        filtered["sources_public"] = disaster_json["sources"]

    if "recommended_resources" in disaster_json and "recommended_resources_public" not in filtered:
        filtered["recommended_resources_public"] = disaster_json["recommended_resources"]

    return filtered


@app.route("/login", methods=["GET", "POST"])
def login():
    """
    Renders login page and handles credential authentication.
    """
    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "").strip()
        user_info = authenticate(email, password)
        if user_info:
            session["user"] = user_info
            logger.info(f"User '{user_info['name']}' logged in successfully with role '{user_info['role']}'.")
            return redirect(url_for("index"))
        else:
            return render_template("login.html", error="Invalid email or password.")
    
    return render_template("login.html")


@app.route("/logout", methods=["GET"])
def logout():
    """
    Clears current user session and redirects to homepage.
    """
    session.pop("user", None)
    return redirect(url_for("index"))


@app.route("/", methods=["GET"])
def index():
    """
    Renders Homepage / Emergency Operations Center (EOC) Dashboard.
    """
    current_user = session.get("user")
    user_role = current_user.get("role", "regular") if current_user else "regular"
    return render_template("index.html", user=current_user, role=user_role)


@app.route("/report", methods=["GET"])
def report():
    """
    Renders Printable Incident Briefing Report page.
    """
    current_user = session.get("user")
    if not current_user or current_user.get("role") != "admin":
        return redirect(url_for("login"))
    return render_template("report.html")


GDACS_LOOKUPS = {}


from geocode_client import reverse_geocode


@app.route("/api/analyze", methods=["POST"])
def analyze_disaster():
    """
    Main API endpoint for disaster query processing.
    Receives JSON body: {"query": "Flood in Chennai", "latitude": 13.0827, "longitude": 80.2707}
    Returns role-filtered disaster analysis JSON payload.
    """
    try:
        data = request.get_json(silent=True) or {}
        query = data.get("query", "").strip()

        if not query:
            return jsonify({
                "status": "error",
                "message": "Disaster location or event query is required."
            }), 400

        logger.info(f"Processing disaster query request: '{query}'")

        # Obtain canonical resolved_place for request
        lat = data.get("latitude") or data.get("lat")
        lon = data.get("longitude") or data.get("lon") or data.get("lng")
        if lat is not None and lon is not None:
            try:
                resolved_place = resolve_place(float(lat), float(lon))
            except Exception:
                geo = geocode_location(query)
                resolved_place = resolve_place(geo["lat"], geo["lng"])
        else:
            geo = geocode_location(query)
            resolved_place = resolve_place(geo["lat"], geo["lng"])

        # Execute LangChain Disaster Agent Workflow
        result_json = disaster_agent.analyze_disaster(query, resolved_place=resolved_place)
        if "evacuation_shelters" in result_json and isinstance(result_json["evacuation_shelters"], list):
            result_json["evacuation_shelters"] = apply_shelter_overrides(result_json["evacuation_shelters"])

        # Attach GDACS verification metadata if query originated from GDACS lookup
        if query in GDACS_LOOKUPS:
            gd_info = GDACS_LOOKUPS[query]
            result_json["gdacs_verified"] = gd_info["gdacs_verified"]
            result_json["gdacs_event_type"] = gd_info.get("event_type", "")
            result_json["gdacs_alert_level"] = gd_info["gdacs_alert_level"]
            result_json["gdacs_distance_km"] = gd_info["gdacs_distance_km"]
            result_json["gdacs_event_location"] = gd_info.get("gdacs_event_location", "")
            result_json["gdacs_source_url"] = gd_info["gdacs_source_url"]

        # Apply role-based field filtering before sending to client
        current_user = session.get("user")
        user_role = current_user.get("role", "regular") if current_user else "regular"
        filtered_json = filter_for_role(result_json, user_role)

        return jsonify({
            "status": "success",
            "query": query,
            "role": user_role,
            "data": filtered_json
        }), 200

    except Exception as e:
        logger.error(f"Error during disaster analysis execution: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"An unexpected error occurred during processing: {str(e)}"
        }), 500


@app.route("/api/nearby-disaster/lookup", methods=["POST"])
def nearby_disaster_lookup():
    """
    Cheap GDACS + reverse-geocode check. Does NOT call Tavily/LangChain.
    Tells the frontend what's near the user in terms of the user's OWN location.
    """
    try:
        data = request.get_json(silent=True) or {}
        lat = data.get("latitude")
        lon = data.get("longitude")

        if lat is None or lon is None:
            return jsonify({
                "status": "error",
                "message": "Location coordinates (latitude and longitude) are required."
            }), 400

        try:
            lat_float = float(lat)
            lon_float = float(lon)
        except (ValueError, TypeError):
            return jsonify({
                "status": "error",
                "message": "Invalid latitude or longitude numeric values."
            }), 400

        try:
            nearby = find_nearby_disasters(lat_float, lon_float, radius_km=500.0)
        except Exception as g_err:
            logger.error(f"GDACS lookup error: {g_err}")
            return jsonify({
                "status": "error",
                "message": "Could not reach the global disaster monitor right now — try typing your location manually."
            }), 503

        if not nearby:
            return jsonify({
                "status": "none_found",
                "message": "No active disasters detected near your location (within 500 km) per GDACS global monitoring. You can still search manually above."
            }), 200

        top = nearby[0]
        user_place = resolve_place(lat_float, lon_float)
        user_location_label = user_place["short_label"]
        gdacs_place = top.get("event_location_label") or top.get("country") or top.get("event_name") or "nearby region"

        # TWO separate queries — two separate pills:
        local_query = f"Latest disaster or emergency situation near {user_location_label}"
        gdacs_query = f"{top['event_type']} near {gdacs_place}"
        gdacs_source_url = f"https://www.gdacs.org/report.aspx?eventid={top['eventid']}&eventtype={top['event_type_code']}"

        # Save lookup metadata specifically for the confirmed GDACS event query
        GDACS_LOOKUPS[gdacs_query] = {
            "gdacs_verified": True,
            "event_type": top["event_type"],
            "gdacs_alert_level": top["alert_level"],
            "gdacs_distance_km": top["distance_km"],
            "gdacs_event_location": gdacs_place,
            "gdacs_source_url": gdacs_source_url
        }

        return jsonify({
            "status": "found",
            "local_query": local_query,
            "user_location_label": user_location_label,
            "gdacs_query": gdacs_query,
            "event_type": top["event_type"],
            "gdacs_event_location": gdacs_place,
            "affected_countries": top.get("affected_countries", []),
            "alert_level": top["alert_level"],
            "distance_km": top["distance_km"],
            "gdacs_source_url": gdacs_source_url
        }), 200

    except Exception as e:
        logger.error(f"Error in /api/nearby-disaster/lookup: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"Nearby disaster lookup failed: {str(e)}"
        }), 500


@app.route("/api/nearby-disaster", methods=["POST"])
def nearby_disaster():
    """
    Location-triggered disaster search via GDACS global disaster monitor.
    Receives JSON body: {"latitude": ..., "longitude": ...}
    Queries GDACS for active events within 500 km.
    If events found, feeds query to live analysis pipeline and decorates response with GDACS metadata.
    """
    try:
        data = request.get_json(silent=True) or {}
        lat = data.get("latitude")
        lon = data.get("longitude")

        if lat is None or lon is None:
            return jsonify({
                "status": "error",
                "message": "Location coordinates (latitude and longitude) are required."
            }), 400

        try:
            lat_float = float(lat)
            lon_float = float(lon)
        except (ValueError, TypeError):
            return jsonify({
                "status": "error",
                "message": "Invalid latitude or longitude numeric values."
            }), 400

        # Query GDACS API
        try:
            nearby = find_nearby_disasters(lat_float, lon_float, radius_km=500.0)
        except Exception as g_err:
            logger.error(f"GDACS lookup error: {g_err}")
            return jsonify({
                "status": "error",
                "message": "Could not reach the global disaster monitor right now — try typing your location manually."
            }), 503

        if not nearby:
            return jsonify({
                "status": "none_found",
                "message": "No active disasters detected near your location (within 500 km) per GDACS global monitoring. You can still search manually above."
            }), 200

        top = nearby[0]
        user_place = resolve_place(lat_float, lon_float)
        gdacs_place = top.get("event_location_label") or top.get("country") or "nearby location"
        query = f"{top['event_type']} near {gdacs_place}"
        
        logger.info(f"📍 GDACS Nearby Event Detected: {query} ({top['distance_km']} km away)")
        
        # Execute live analysis pipeline anchored by user_place
        result_json = disaster_agent.analyze_disaster(query, resolved_place=user_place)
        if "evacuation_shelters" in result_json and isinstance(result_json["evacuation_shelters"], list):
            result_json["evacuation_shelters"] = apply_shelter_overrides(result_json["evacuation_shelters"])
        
        # Attach GDACS verification metadata
        result_json["gdacs_verified"] = True
        result_json["gdacs_alert_level"] = top["alert_level"]
        result_json["gdacs_distance_km"] = top["distance_km"]
        result_json["gdacs_event_location"] = gdacs_place
        result_json["gdacs_source_url"] = f"https://www.gdacs.org/report.aspx?eventid={top['eventid']}&eventtype={top['event_type_code']}"
        result_json["affected_countries"] = top.get("affected_countries", [])

        # Apply role-based filtering
        current_user = session.get("user")
        user_role = current_user.get("role", "regular") if current_user else "regular"
        filtered_json = filter_for_role(result_json, user_role)

        return jsonify({
            "status": "success",
            "query": query,
            "role": user_role,
            "gdacs_verified": True,
            "gdacs_alert_level": top["alert_level"],
            "gdacs_distance_km": top["distance_km"],
            "gdacs_source_url": result_json["gdacs_source_url"],
            "data": filtered_json
        }), 200

    except Exception as e:
        logger.error(f"Error in /api/nearby-disaster: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"Nearby disaster analysis failed: {str(e)}"
        }), 500



@app.route("/api/copilot/chat", methods=["POST"])
@role_required("admin")
def copilot_chat():
    """
    AI Copilot Chat Endpoint (Admin Only).
    """
    try:
        data = request.get_json(silent=True) or {}
        user_message = data.get("message", "").strip()
        analysis_context = data.get("context", {})

        if not user_message:
            return jsonify({
                "status": "error",
                "answer": "Current data does not contain this information."
            }), 400

        logger.info(f"Processing AI Copilot query: '{user_message}'")
        answer = disaster_agent.answer_copilot_question(user_message, analysis_context)

        return jsonify({
            "status": "success",
            "answer": answer
        }), 200

    except Exception as e:
        logger.error(f"Error processing Copilot chat query: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "answer": "Current data does not contain this information."
        }), 500


@app.route("/api/report/pdf", methods=["POST"])
@role_required("admin")
def download_report_pdf():
    """
    Generates and returns a downloadable PDF Incident Report (Admin Only).
    """
    try:
        disaster_data = request.get_json(silent=True) or {}
        report_data = report_agent.generate_incident_report_data(disaster_data)
        
        temp_dir = tempfile.gettempdir()
        pdf_filename = f"Incident_Report_{int(request.date.timestamp() if request.date else 1000)}.pdf"
        output_pdf_path = os.path.join(temp_dir, pdf_filename)
        
        report_agent.generate_pdf(report_data, output_pdf_path)

        disaster_name = str(disaster_data.get("disaster_type", "Disaster")).replace(" ", "_")
        download_name = f"Incident_Report_{disaster_name}.pdf"

        return send_file(
            output_pdf_path,
            as_attachment=True,
            download_name=download_name,
            mimetype="application/pdf"
        )

    except Exception as e:
        logger.error(f"Error producing PDF report: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"Failed to produce PDF report: {str(e)}"
        }), 500


@app.route("/api/sos", methods=["POST"])
def send_emergency_sos():
    """
    Emergency SOS Dispatch Endpoint (Public).
    Receives JSON payload with user details, live GPS coordinates, accuracy, and timestamp.
    Validates coordinates, logs to in-memory store, and dispatches to n8n webhook if configured.
    """
    try:
        data = request.get_json(silent=True) or {}
        
        name = str(data.get("name", "")).strip() or "Registered Emergency User"
        phone = str(data.get("phone", "")).strip() or "Not Provided"
        contact_name = str(data.get("emergency_contact_name", "")).strip() or "Emergency Contact"
        contact_phone = str(data.get("emergency_contact_phone", "")).strip() or "Not Provided"
        
        lat = data.get("latitude")
        lng = data.get("longitude")
        accuracy = data.get("accuracy", "Unknown")
        timestamp = str(data.get("timestamp", "")).strip() or "Current Time"

        # Strict validation: Do NOT accept missing latitude/longitude
        if lat is None or lng is None:
            log_sos_event(data, "", False, "invalid_coordinates")
            return jsonify({
                "status": "error",
                "message": "Invalid or missing device GPS latitude/longitude. Real location is required for SOS dispatch."
            }), 400

        try:
            lat_float = float(lat)
            lng_float = float(lng)
        except (ValueError, TypeError):
            log_sos_event(data, "", False, "invalid_coordinates")
            return jsonify({
                "status": "error",
                "message": "Invalid latitude/longitude numeric values."
            }), 400

        # Construct Google Maps link from REAL device coordinates
        maps_url = f"https://www.google.com/maps?q={lat_float},{lng_float}"

        # Construct formatted emergency text message
        sos_message = (
            f"🚨 EMERGENCY SOS ALERT\n\n"
            f"Person:\n{name}\n\n"
            f"Phone:\n{phone}\n\n"
            f"Emergency Contact:\n{contact_name} ({contact_phone})\n\n"
            f"Time:\n{timestamp}\n\n"
            f"Current Location:\n{maps_url}\n\n"
            f"Latitude:\n{lat_float}\n\n"
            f"Longitude:\n{lng_float}\n\n"
            f"Location Accuracy:\n{accuracy} meters\n\n"
            f"This is an emergency alert. Please contact the person and/or emergency services immediately."
        )

        logger.info(f"🚨 EMERGENCY SOS DISPATCHED: Person='{name}', Lat={lat_float}, Lng={lng_float}")

        # Check if n8n webhook URL is configured
        webhook_url = Config.N8N_SOS_WEBHOOK_URL
        if webhook_url:
            import requests
            payload = {
                "name": name,
                "phone": phone,
                "emergency_contact_name": contact_name,
                "emergency_contact_phone": contact_phone,
                "latitude": lat_float,
                "longitude": lng_float,
                "accuracy": accuracy,
                "timestamp": timestamp,
                "maps_url": maps_url,
                "sos_message": sos_message
            }
            try:
                resp = requests.post(webhook_url, json=payload, headers={"Content-Type": "application/json"}, timeout=10)
                if resp.status_code in [200, 201, 202]:
                    log_sos_event(data, maps_url, True, "success")
                    return jsonify({
                        "status": "success",
                        "message": "Emergency SOS alert transmitted and delivered to emergency contact via n8n workflow.",
                        "maps_url": maps_url,
                        "delivered": True
                    }), 200
                else:
                    log_sos_event(data, maps_url, False, "error")
                    return jsonify({
                        "status": "error",
                        "message": f"n8n webhook returned HTTP {resp.status_code}: {resp.text[:200]}",
                        "maps_url": maps_url,
                        "delivered": False
                    }), 502
            except Exception as w_err:
                logger.error(f"n8n Webhook POST connection failure: {w_err}")
                log_sos_event(data, maps_url, False, "error")
                return jsonify({
                    "status": "error",
                    "message": f"Failed to connect to n8n webhook URL: {str(w_err)}",
                    "maps_url": maps_url,
                    "delivered": False
                }), 502
        else:
            logger.info("N8N_SOS_WEBHOOK_URL is not configured in .env. Returning notification_not_configured state.")
            log_sos_event(data, maps_url, False, "notification_not_configured")
            return jsonify({
                "status": "notification_not_configured",
                "message": "Location captured ✓, but N8N_SOS_WEBHOOK_URL is not configured in environment.",
                "maps_url": maps_url,
                "delivered": False,
                "sos_message": sos_message
            }), 200

    except Exception as e:
        logger.error(f"Unexpected error in /api/sos: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"Backend SOS processing failure: {str(e)}"
        }), 500


@app.route("/api/sos/log", methods=["GET"])
@role_required("admin")
def get_sos_log():
    """
    Returns the in-memory SOS event log (Admin Only).
    """
    return jsonify({
        "status": "success",
        "log": list_sos_log()
    }), 200


@app.route("/api/sos/<int:sos_id>/reviewed", methods=["PATCH"])
@role_required("admin")
def update_sos_reviewed(sos_id: int):
    """
    Marks an SOS alert as reviewed by an admin (Admin Only).
    """
    updated_record = mark_sos_reviewed(sos_id)
    if updated_record:
        return jsonify({
            "status": "success",
            "record": updated_record
        }), 200
    else:
        return jsonify({
            "status": "error",
            "message": f"SOS record #{sos_id} not found."
        }), 404


@app.route("/api/mark-safe", methods=["POST"])
def mark_safe():
    """
    Public Safety Check-In Endpoint.
    Reuses existing emergency contact & n8n webhook infrastructure to send a reassurance message.
    """
    try:
        data = request.get_json(silent=True) or {}
        name = str(data.get("name", "")).strip() or "Registered User"
        contact_name = str(data.get("emergency_contact_name", "")).strip() or "Emergency Contact"
        contact_phone = str(data.get("emergency_contact_phone", "")).strip() or "Not Provided"
        timestamp = str(data.get("timestamp", "")).strip() or "Current Time"

        reassurance_msg = (
            f"✅ SAFETY CHECK-IN\n\n{name} has marked themselves as SAFE.\n\n"
            f"Time: {timestamp}\n\nNo action needed — this is a reassurance message, not an alert."
        )

        webhook_url = Config.N8N_SOS_WEBHOOK_URL
        delivered = False
        delivery_status = "notification_not_configured"

        if webhook_url:
            try:
                wb_resp = requests.post(
                    webhook_url,
                    json={
                        "event_type": "MARK_SAFE",
                        "name": name,
                        "emergency_contact_name": contact_name,
                        "emergency_contact_phone": contact_phone,
                        "message": reassurance_msg,
                        "timestamp": timestamp
                    },
                    headers={"Content-Type": "application/json"},
                    timeout=5
                )
                if wb_resp.status_code in [200, 201, 202]:
                    delivered = True
                    delivery_status = "success"
                else:
                    delivery_status = f"error_{wb_resp.status_code}"
            except Exception as w_err:
                logger.error(f"Mark-safe n8n webhook error: {w_err}")
                delivery_status = f"error_{str(w_err)}"

        return jsonify({
            "status": "success" if delivered else ("notification_not_configured" if delivery_status == "notification_not_configured" else "error"),
            "message": "Safety check-in recorded and transmitted.",
            "delivery_status": delivery_status,
            "reassurance": reassurance_msg
        }), 200

    except Exception as e:
        logger.error(f"Error in /api/mark-safe: {e}", exc_info=True)
        return jsonify({"status": "error", "message": f"Safety check-in failed: {str(e)}"}), 500


@app.route("/api/shelters/<path:shelter_name>/override", methods=["PATCH"])
@role_required("admin")
def update_shelter_override(shelter_name: str):
    """
    Admin-only inline shelter capacity and status override.
    """
    try:
        data = request.get_json(silent=True) or {}
        status = str(data.get("status", "")).strip()
        capacity = str(data.get("capacity", "")).strip()

        if not status or not capacity:
            return jsonify({"status": "error", "message": "Both status and capacity fields are required."}), 400

        override = set_shelter_override(shelter_name, status, capacity)
        return jsonify({
            "status": "success",
            "shelter_name": shelter_name,
            "override": override
        }), 200
    except Exception as e:
        logger.error(f"Error overriding shelter '{shelter_name}': {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/alerts", methods=["POST"])
@role_required("admin")
def create_alert():
    """
    Admin-only broadcast alert creation.
    """
    try:
        data = request.get_json(silent=True) or {}
        msg = str(data.get("message", "")).strip()
        sev = str(data.get("severity", "info")).strip().lower()
        expires = int(data.get("expires_in_minutes", 60))

        if not msg:
            return jsonify({"status": "error", "message": "Alert message body is required."}), 400

        if sev not in ["critical", "warning", "info"]:
            sev = "info"

        alert = add_alert(msg, sev, expires)
        return jsonify({"status": "success", "alert": alert}), 201
    except Exception as e:
        logger.error(f"Error creating broadcast alert: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/alerts/active", methods=["GET"])
def active_alerts():
    """
    Public broadcast alerts endpoint — checked by all clients every 10-15s.
    """
    return jsonify({
        "status": "success",
        "alerts": list_active_alerts()
    }), 200


@app.route("/api/alerts/all", methods=["GET"])
@role_required("admin")
def all_alerts():
    """
    Admin endpoint to view all alerts (active, expired, retracted).
    """
    return jsonify({
        "status": "success",
        "alerts": list_all_alerts()
    }), 200


@app.route("/api/alerts/<int:alert_id>/retract", methods=["PATCH"])
@role_required("admin")
def retract(alert_id: int):
    """
    Admin-only alert retraction endpoint.
    """
    ok = retract_alert(alert_id)
    if ok:
        return jsonify({"status": "success", "retracted": True, "alert_id": alert_id}), 200
    else:
        return jsonify({"status": "error", "message": f"Alert #{alert_id} not found."}), 404


if __name__ == "__main__":
    logger.info(f"Starting AI Disaster Response Coordinator on port {Config.PORT}...")
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
