import os
import datetime
import logging
from fpdf import FPDF

logger = logging.getLogger(__name__)

class DisasterPDF(FPDF):
    """Custom FPDF class with EOC header & footer."""

    def header(self):
        self.set_fill_color(11, 15, 25) # Dark EOC Navy
        self.rect(0, 0, 210, 25, 'F')
        self.set_font('Helvetica', 'B', 14)
        self.set_text_color(255, 255, 255)
        self.cell(0, 10, 'AI DISASTER RESPONSE COORDINATOR | EOC BRIEFING REPORT', border=False, new_x="LMARGIN", new_y="NEXT", align='C')
        self.set_font('Helvetica', 'I', 9)
        self.set_text_color(0, 229, 255) # Cyber cyan accent
        self.cell(0, 5, f'Generated: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")}', border=False, new_x="LMARGIN", new_y="NEXT", align='C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Helvetica', 'I', 8)
        self.set_text_color(128, 128, 128)
        self.cell(0, 10, f'Page {self.page_no()}/{{nb}} | Official Emergency Operations Briefing - Restricted Distribution', align='C')


class ReportAgent:
    """Agent responsible for compiling incident report payloads and PDF exports."""

    def generate_incident_report_data(self, disaster_data: dict) -> dict:
        """Structures data specifically formatted for the report view and export."""
        now_str = datetime.datetime.now().strftime("%B %d, %Y - %H:%M HRS")
        
        report = {
            "title": f"OFFICIAL INCIDENT REPORT: {disaster_data.get('disaster_type', 'Emergency Situation').upper()}",
            "datetime": now_str,
            "disaster_type": disaster_data.get("disaster_type", "Unknown"),
            "severity": disaster_data.get("severity", "High"),
            "priority": disaster_data.get("priority", "P1 - High Priority"),
            "summary": disaster_data.get("summary", ""),
            "affected_areas": disaster_data.get("affected_locations", []),
            "recommended_rescue_actions": disaster_data.get("recommended_resources", []),
            "public_advisory": disaster_data.get("safety_measures", []),
            "immediate_risks": disaster_data.get("immediate_risks", []),
            "incident_report_text": disaster_data.get("incident_report", ""),
            "sources": disaster_data.get("sources", [])
        }
        return report

    def generate_pdf(self, report_data: dict, output_path: str) -> str:
        """Renders and saves a formatted PDF report using FPDF2."""
        try:
            pdf = DisasterPDF()
            pdf.alias_nb_pages()
            pdf.add_page()
            pdf.set_auto_page_break(auto=True, margin=15)

            # Title Section
            pdf.set_font("Helvetica", "B", 15)
            pdf.set_text_color(15, 23, 42)
            pdf.multi_cell(pdf.epw, 8, str(report_data.get("title", "INCIDENT REPORT")))
            pdf.ln(2)

            # Key Meta Grid
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_fill_color(240, 244, 248)
            
            meta_text = (
                f"Date/Time: {report_data.get('datetime')}  |  "
                f"Severity: {report_data.get('severity')}  |  "
                f"Priority: {report_data.get('priority')}"
            )
            pdf.multi_cell(pdf.epw, 8, meta_text, fill=True, border=1)
            pdf.ln(4)

            # Executive Summary
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(15, 23, 42)
            pdf.cell(pdf.epw, 8, "1. EXECUTIVE BRIEFING & SUMMARY", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(51, 65, 85)
            pdf.multi_cell(pdf.epw, 6, str(report_data.get("summary", "N/A")))
            pdf.ln(4)

            # Affected Locations
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(15, 23, 42)
            pdf.cell(pdf.epw, 8, "2. AFFECTED LOCATIONS & IMPACT SECTORS", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(51, 65, 85)
            
            locations = report_data.get("affected_areas", [])
            if locations:
                for loc in locations:
                    if isinstance(loc, dict):
                        loc_line = f"- {loc.get('name')}: Severity [{loc.get('severity')}] - {loc.get('details', '')}"
                    else:
                        loc_line = f"- {loc}"
                    pdf.multi_cell(pdf.epw, 6, loc_line)
            else:
                pdf.multi_cell(pdf.epw, 6, "No specific locations listed.")
            pdf.ln(4)

            # Recommended Rescue Actions
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(15, 23, 42)
            pdf.cell(pdf.epw, 8, "3. RECOMMENDED RESCUE & RESOURCE ALLOCATION", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(51, 65, 85)
            for res in report_data.get("recommended_rescue_actions", []):
                pdf.multi_cell(pdf.epw, 6, f"[REQUIRED] {res}")
            pdf.ln(4)

            # Public Advisory & Safety
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(15, 23, 42)
            pdf.cell(pdf.epw, 8, "4. PUBLIC ADVISORY & SAFETY MEASURES", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(51, 65, 85)
            for me in report_data.get("public_advisory", []):
                pdf.multi_cell(pdf.epw, 6, f"[ADVISORY] {me}")
            pdf.ln(4)

            # Intelligence Sources
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(15, 23, 42)
            pdf.cell(pdf.epw, 8, "5. INTELLIGENCE SOURCES", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(100, 116, 139)
            sources = report_data.get("sources", [])
            if sources:
                for src in sources:
                    pdf.multi_cell(pdf.epw, 5, f"Source: {src}")
            else:
                pdf.multi_cell(pdf.epw, 5, "Internal EOC Search Assessment")

            # Save PDF
            dir_path = os.path.dirname(output_path)
            if dir_path:
                os.makedirs(dir_path, exist_ok=True)
            pdf.output(output_path)
            logger.info(f"Successfully generated PDF report at: {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"Failed to generate PDF: {e}")
            raise e
