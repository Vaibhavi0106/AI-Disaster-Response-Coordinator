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


@app.route("/api/report/pdf", methods=["POST"])
def download_report_pdf():
    """
    Generates and returns a downloadable PDF Incident Report.
    Receives analyzed disaster JSON payload in request body.
    """
    try:
        disaster_data = request.get_json(silent=True) or {}
        
        # Structure report content
        report_data = report_agent.generate_incident_report_data(disaster_data)
        
        # Create temporary PDF file
        temp_dir = tempfile.gettempdir()
        pdf_filename = f"Incident_Report_{int(request.date.timestamp() if request.date else 1000)}.pdf"
        output_pdf_path = os.path.join(temp_dir, pdf_filename)
        
        # Generate PDF using FPDF2 engine
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


if __name__ == "__main__":
    logger.info(f"Starting AI Disaster Response Coordinator on port {Config.PORT}...")
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
