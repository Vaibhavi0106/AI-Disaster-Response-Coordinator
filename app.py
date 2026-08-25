import os
import tempfile
import logging
from flask import Flask, render_template, request, jsonify, send_file
from config import Config
from agents.disaster_agent import DisasterAgent
from agents.report_agent import ReportAgent

# Configure Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("AppEngine")

# Initialize Flask Application
app = Flask(__name__)
app.config.from_object(Config)

# Instantiate AI Agents
disaster_agent = DisasterAgent()
report_agent = ReportAgent()


@app.route("/", methods=["GET"])
def index():
    """
    Renders Homepage / Emergency Operations Center (EOC) Dashboard.
    """
    return render_template("index.html")


@app.route("/report", methods=["GET"])
def report():
    """
    Renders Printable Incident Briefing Report page.
    """
    return render_template("report.html")


@app.route("/api/analyze", methods=["POST"])
def analyze_disaster():
    """
    Main API endpoint for disaster query processing.
    Receives JSON body: {"query": "Flood in Chennai"}
    Returns structured disaster analysis JSON payload.
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
        
        # Execute LangChain Disaster Agent Workflow
        result_json = disaster_agent.analyze_disaster(query)

        return jsonify({
            "status": "success",
            "query": query,
            "data": result_json
        }), 200

    except Exception as e:
        logger.error(f"Error during disaster analysis execution: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"An unexpected error occurred during processing: {str(e)}"
        }), 500


@app.route("/api/copilot/chat", methods=["POST"])
def copilot_chat():
    """
    AI Copilot Chat Endpoint.
    Receives JSON: { "message": "...", "context": { ... } }
    Returns operational AI answer grounded in current disaster analysis.
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
def download_report_pdf():
    """
    Generates and returns a downloadable PDF Incident Report.
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
    Emergency SOS Dispatch Endpoint.
    Receives JSON payload with user details, live GPS coordinates, accuracy, and timestamp.
    Validates coordinates and dispatches to n8n webhook if configured.
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
            return jsonify({
                "status": "error",
                "message": "Invalid or missing device GPS latitude/longitude. Real location is required for SOS dispatch."
            }), 400

        try:
            lat_float = float(lat)
            lng_float = float(lng)
        except (ValueError, TypeError):
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
        logger.info(f"🔥 ACTUAL N8N WEBHOOK URL BEING USED: {webhook_url}")
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
                    return jsonify({
                        "status": "success",
                        "message": "Emergency SOS alert transmitted and delivered to emergency contact via n8n workflow.",
                        "maps_url": maps_url,
                        "delivered": True
                    }), 200
                else:
                    return jsonify({
                        "status": "error",
                        "message": f"n8n webhook returned HTTP {resp.status_code}: {resp.text[:200]}",
                        "maps_url": maps_url,
                        "delivered": False
                    }), 502
            except Exception as w_err:
                logger.error(f"n8n Webhook POST connection failure: {w_err}")
                return jsonify({
                    "status": "error",
                    "message": f"Failed to connect to n8n webhook URL: {str(w_err)}",
                    "maps_url": maps_url,
                    "delivered": False
                }), 502
        else:
            logger.info("N8N_SOS_WEBHOOK_URL is not configured in .env. Returning notification_not_configured state.")
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



if __name__ == "__main__":
    logger.info(f"Starting AI Disaster Response Coordinator on port {Config.PORT}...")
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
