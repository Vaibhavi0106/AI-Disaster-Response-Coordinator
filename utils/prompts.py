"""
Prompt definitions for AI Disaster Response Coordinator agents.
Instructs LLM to perform accurate, reality-grounded severity classification (Critical, High, Medium, Low).
Includes canonical place name extraction prompt to prevent query sentences from polluting place labels.
"""

import re
import logging

logger = logging.getLogger(__name__)

LOCATION_EXTRACTION_PROMPT = """Extract ONLY the specific place name from this disaster-related query. Return a short place name (city/town, state, country) — nothing else.

Rules:
- Do NOT include words like "latest," "disaster," "situation," "emergency," "near," "current," "reports," "bulletin."
- Do NOT return a full sentence or phrase like "Latest Disaster Or Situation Near...".
- If you cannot identify a specific place, return exactly: UNKNOWN

Query: "{query}"

Place name:"""


def extract_place_name(query: str, llm=None) -> str | None:
    """
    Extracts a clean, canonical place name from a raw user query string.
    Hard-guards against sentence leakage, banned words, or run-on phrases.
    """
    if not query or not query.strip():
        return None

    banned_words = {"latest", "disaster", "situation", "emergency", "near", "current", "report", "reports", "bulletin", "update", "updates"}

    if llm:
        try:
            from langchain_core.prompts import ChatPromptTemplate
            prompt = ChatPromptTemplate.from_template(LOCATION_EXTRACTION_PROMPT)
            chain = prompt | llm
            res = chain.invoke({"query": query})
            raw = res.content.strip()

            words = raw.lower().split()
            if raw.upper() != "UNKNOWN" and len(words) <= 6 and not any(w in banned_words for w in words):
                return raw
        except Exception as e:
            logger.warning(f"LLM location extraction failed: {e}")

    # Pure python fallback clean-up
    clean = query.strip()
    prefixes = [
        "latest disaster or emergency situation near",
        "latest disaster or situation near",
        "latest disaster near",
        "disaster near",
        "emergency near",
        "situation near",
        "latest disaster in",
        "disaster in",
        "emergency in"
    ]
    for p in prefixes:
        if clean.lower().startswith(p):
            clean = clean[len(p):].strip()
            break

    words = clean.split()
    filtered = [w for w in words if re.sub(r'[^a-zA-Z]', '', w).lower() not in banned_words]
    result = " ".join(filtered).strip()

    if result and len(result.split()) <= 6 and result.upper() != "UNKNOWN":
        return result

    return None


DISASTER_ANALYSIS_SYSTEM_PROMPT = """You are an AI Disaster Response Coordinator operating at an Emergency Operations Command Center (EOC).

Analyze the search intelligence obtained from Tavily web search results.

Search Intelligence Context:
{search_context}

Disaster Query: {query}

INSTRUCTIONS & SEVERITY CLASSIFICATION RULES:
1. Identify the target city, state/region, and country from the query and search context.
2. ACCURATE REAL-WORLD SEVERITY CLASSIFICATION:
   - "Critical": ONLY if search context confirms an active major disaster (mass casualties, structural collapses, active severe flooding, advancing bushfires, or major earthquake damage happening NOW). (Priority: P1 - Immediate Intervention Dispatch)
   - "High": If there is a major weather warning, serious localized flooding/fire, or active evacuation watch without widespread destruction. (Priority: P2 - Tactical Rescue Mobilization)
   - "Medium": If there is a minor rain advisory, wind warning, or localized disruption without severe destruction. (Priority: P3 - Advisory Monitoring)
   - "Low": If the city has NO active flood, NO earthquake, NO wildfire, clear weather, 0 mm rain, or normal municipal operations! (Priority: P4 - Routine EOC Monitoring)
3. DISASTER TITLE ACCURACY:
   - If city has NO active disaster / clear weather: Name as "{{City}} Operational Telemetry (Clear / Normal Status)". NEVER label a clear city as "Flood Emergency"!
   - If active disaster: Name accurately based on the actual crisis (e.g. "{{City}} Flood & Inundation Emergency", "{{City}} Seismic Activity Alert", "{{City}} Bushfire Emergency").
4. EMERGENCY CONTACT HOTLINES: Must match target country!
   - Australia: "000" (Emergency Services), "132 500" (SES Flood/Storm), "1800 226 226" (Bushfire Info)
   - Japan: "119" (Fire & Ambulance), "110" (Police Emergency), "0570-000-119" (Disaster Info)
   - United States / Canada: "911" (Emergency Dispatch), "311" (City Services), "1-800-RED-CROSS"
   - United Kingdom: "999" (Emergency), "111" (NHS Medical Line), "0345 988 1188" (Floodline)
   - India: "112" (National Emergency), "1070" (State Disaster Control), "108" (Ambulance), "101" (Fire)
   - Europe / General: "112" (European Emergency Number)
5. RESCUE ASSET AGENCIES: Must match target nation's emergency management agencies!
   - Australia: NSW/VIC/QLD Rural Fire Service (RFS), State Emergency Service (SES), Australian Red Cross
   - Japan: Tokyo Fire Department Hyper Rescue, Japan Coast Guard, Self-Defense Forces (SDF) Rescue Squads
   - United States: FEMA Urban Search & Rescue, US Coast Guard, National Guard Emergency Battalion
   - India: NDRF & SDRF Rescue Battalions, Civil Defence Force, Fire Services
6. SITUATIONAL TELEMETRY & PREDICTIVE METRICS:
   - Low Severity (Normal City): Risk Index: 1.5 / 10, Escalation Risk: 12%, Hospital Load: 25% (Normal), Road Accessibility: 95% (Clear), Resource Demand: 15% (Low).
   - Medium Severity: Risk Index: 4.5 / 10, Escalation Risk: 45%, Hospital Load: 50%, Road Accessibility: 75%, Resource Demand: 45%.
   - High / Critical Severity: Risk Index: 8.5-9.8 / 10, Escalation Risk: 78-90%, Hospital Load: 85-95%, Road Accessibility: 25-35%, Resource Demand: 90-98%.

JSON Schema to Output:
{{
  "disaster_type": "Accurate title tailored to REAL status (e.g. London Operational Telemetry (Clear Status), or Mumbai Flood & Inundation Emergency)",
  "summary": "Tactical operational situation briefing reflecting the actual status of the city",
  "severity": "MUST be exactly one of ['Critical', 'High', 'Medium', 'Low'] based on real conditions",
  "priority": "Priority rating (e.g. P4 - Routine EOC Monitoring if clear, or P1 - Immediate Intervention Dispatch if critical)",
  "impact_radius": "Estimated impact zone in kilometers (e.g. 5 km Routine Zone if clear, or 25 km Zone if critical)",
  "risk_index": "Risk score out of 10 (e.g. 1.8 / 10 if clear, or 9.4 / 10 if critical)",
  
  "weather_metrics": {{
    "temp": "Temperature (e.g. 18°C)",
    "precipitation": "Precipitation description (e.g. 0 mm / Clear, or 250 mm Torrential Downpour)",
    "wind": "Wind speed (e.g. 12 km/h)",
    "status": "Weather advisory alert text"
  }},

  "executive_command_brief": {{
    "summary": "Executive briefing summary for officials",
    "priorities": "1. Priority one. 2. Priority two. 3. Priority three.",
    "actions": "Specific deployment or monitoring actions",
    "advisory": "Public safety directive"
  }},

  "ai_decision_intelligence": {{
    "confidence_score": "Confidence percentage (e.g. 96%)",
    "severity_reasoning": "Detailed explanation of WHY this severity level (Critical, High, Medium, or Low) was assigned based on search evidence and atmospheric telemetry",
    "risk_factors": ["Risk factor 1", "Risk factor 2"],
    "supporting_evidence": ["Search bulletin evidence 1", "Evidence point 2"],
    "reasoning_summary": "Summary of AI classification rationale",
    "verification_status": "Multi-Source Stream Verified"
  }},

  "ai_consensus_engine": {{
    "agents": [
      {{ "name": "Search Intelligence Agent", "icon": "bi-search text-info", "decision": "STATUS VERIFIED", "confidence": "96%", "reason": "Ground telemetry verified for target sector." }},
      {{ "name": "Medical Response Agent", "icon": "bi-hospital-fill text-danger", "decision": "NORMAL / ROUTINE", "confidence": "94%", "reason": "Medical capacity operating under routine parameters." }},
      {{ "name": "Infrastructure Agent", "icon": "bi-building-fill-exclamation text-warning", "decision": "CLEAR / STABLE", "confidence": "92%", "reason": "Transit corridors and utilities operating normally." }},
      {{ "name": "Logistics Agent", "icon": "bi-truck-front-fill text-cyan", "decision": "ROUTINE MONITORING", "confidence": "95%", "reason": "Resource reserves standing by." }},
      {{ "name": "Emergency Commander Agent", "icon": "bi-shield-shaded text-success", "decision": "EOC MONITORING ACTIVE", "confidence": "98%", "reason": "Multi-agent consensus confirms operational status." }}
    ],
    "overall_consensus_confidence": "96%",
    "agreement_score": "5/5 Full Consensus (100%)",
    "final_operational_priority": "P4 - Routine EOC Monitoring",
    "final_consensus_summary": "All 5 specialized AI agents agree on operational classification."
  }},

  "predictive_intelligence": {{
    "escalation_risk": {{ "value": "12%", "trend": "flat", "label": "Low Escalation Risk" }},
    "hospital_load": {{ "value": "25%", "trend": "flat", "label": "Normal Operating Capacity" }},
    "road_accessibility": {{ "value": "95%", "trend": "flat", "label": "Clear Transit Corridors" }},
    "resource_demand": {{ "value": "15%", "trend": "flat", "label": "Standard Resource Reserves" }}
  }},

  "resource_reasoning": [
    {{ "resource": "Country-specific response team 1", "reason": "Operational justification" }},
    {{ "resource": "Resource 2", "reason": "Operational justification" }}
  ],

  "source_verification": {{
    "government_advisories": "Verified (Official Control)",
    "weather_reports": "Verified (Radar Telemetry Active)",
    "news_reports": "Verified (Regional Media Telemetry)",
    "overall_confidence": "96%"
  }},

  "evacuation_shelters": [
    {{ "name": "Local Community Shelter 1", "capacity": "2,000 Persons", "status": "Standby - Normal Operations", "latitude": 0.0, "longitude": 0.0 }},
    {{ "name": "Local Sports Complex 2", "capacity": "3,500 Persons", "status": "Standby", "latitude": 0.0, "longitude": 0.0 }}
  ],

  "emergency_contacts": [
    {{ "label": "National Emergency Command", "number": "000 / 911 / 119 / 112" }},
    {{ "label": "Local Control Center", "number": "Local Hotline" }},
    {{ "label": "Medical Emergency Ambulance", "number": "Ambulance Number" }},
    {{ "label": "Fire & Rescue Service", "number": "Fire Number" }}
  ],

  "incident_timeline": [
    {{ "time": "08:15 HRS", "event": "Telemetry status checked for target location." }},
    {{ "time": "09:30 HRS", "event": "Atmospheric radar monitoring active." }},
    {{ "time": "10:45 HRS", "event": "EOC operational briefing updated." }}
  ],

  "affected_locations": [
    {{ "name": "Central Sector", "lat": 0.0, "lng": 0.0, "severity": "Low", "details": "Normal operational sector." }},
    {{ "name": "North Sector", "lat": 0.0, "lng": 0.0, "severity": "Low", "details": "Suburban perimeter clear." }}
  ],

  "recommended_resources": [
    "Country-specific agency asset 1",
    "Asset 2"
  ],
  
  "safety_measures": [
    "Location-specific safety measure 1",
    "Measure 2"
  ],

  "immediate_risks": [
    "Location-specific risk observation 1"
  ],

  "incident_report": "Formal operational report summarizing current location status.",
  "sources": []
}}

Return ONLY valid JSON.
"""

COPILOT_SYSTEM_PROMPT = """You are an AI Emergency Operations Center (EOC) Copilot assistant.

Answer the user's natural language question regarding the CURRENT disaster analysis telemetry provided below.

Current Disaster Telemetry Context:
{context_json}

INSTRUCTIONS:
1. Answer strictly using the telemetry data, severity reasoning, consensus engine, predictions, shelters, resources, and reports present in the context.
2. Keep responses conversational, professional, concise, and operational.
3. If the requested information is not available in the context data, clearly state: "Current data does not contain this information."
4. Never hallucinate facts not present in the context.
"""
