# 🚨 AI Disaster Response Coordinator

An Emergency Operations Center (EOC) web application built with **Python Flask**, **LangChain**, **Tavily Search API**, and **Leaflet.js OpenStreetMap**.

![EOC Dashboard](https://img.shields.io/badge/System-EOC_Dashboard-00e5ff)
![Framework](https://img.shields.io/badge/Backend-Flask_3.0-blue)
![AI Framework](https://img.shields.io/badge/AI-LangChain-green)
![Maps](https://img.shields.io/badge/Maps-Leaflet.js-orange)

---

## 🌟 Key Features

- 🛰️ **Real-Time Crisis Intelligence**: Searches live news, bulletins, and weather reports via Tavily Web Search API.
- 🧠 **LangChain Structured Intelligence**: Parses raw search results into validated JSON containing disaster type, severity badges, response priorities, affected locations, and resource recommendations.
- 🗺️ **Interactive Tactical Map**: Automatically geocodes affected locations and plots colored Leaflet.js map markers matching severity levels (Critical → Red, High → Orange, Medium → Yellow, Low → Green).
- ⚡ **Glassmorphism EOC Interface**: Modern dark-mode Emergency Operations Center dashboard built with Bootstrap 5, glassmorphism CSS, and responsive layout.
- 📄 **Incident Briefing & PDF Export**: Generates printable incident reports and downloadable PDF files via `fpdf2`.
- 🔄 **Resilient Fallback Engine**: Functions seamlessly both with live API keys and in demonstration fallback mode.

---

## 📁 Project Structure

```
AI-Disaster-Response-Coordinator/
│
├── app.py                   # Flask Application Server & API Routes
├── config.py                # Environment & Application Settings
├── requirements.txt         # Python Package Dependencies
├── .env                     # API Keys & Environment Configuration
├── README.md                # Documentation & Setup Guide
│
├── agents/
│   ├── disaster_agent.py   # LangChain Analysis Agent
│   ├── search_agent.py     # Tavily Search API Integration Agent
│   └── report_agent.py     # Incident Briefing & PDF Generation Agent
│
├── templates/
│   ├── index.html          # EOC Dashboard Homepage
│   └── report.html         # Printable Incident Briefing Page
│
├── static/
│   ├── css/
│   │    └── style.css      # Glassmorphism EOC Dark Theme Stylesheet
│   ├── js/
│   │    └── app.js         # Vanilla JS Application & Leaflet Logic
│   └── images/
│
└── utils/
     ├── prompts.py         # System Prompts & LLM Instructions
     └── parser.py          # JSON Extractor, Validator & Geocoder
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.9 or higher installed

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment Variables
Edit the `.env` file in the root directory:
```env
FLASK_SECRET_KEY=your_secret_key
FLASK_PORT=5000
FLASK_DEBUG=True

# Optional: Add Tavily API Key for live search queries
TAVILY_API_KEY=tvly-xxxxxxx

# Optional: Add OpenAI API Key for live LangChain LLM extraction
OPENAI_API_KEY=sk-xxxxxxx
```

### 4. Run Application
```bash
python app.py
```

Open your browser and navigate to:
`http://localhost:5000`

---

## 📊 Sample JSON Output Schema

```json
{
    "disaster_type": "Flood Emergency",
    "summary": "Heavy rainfall triggering severe urban flooding and waterlogging...",
    "severity": "Critical",
    "priority": "P1 - Immediate Rescue & Relief",
    "affected_locations": [
        {
            "name": "Velachery",
            "lat": 12.9757,
            "lng": 80.2207,
            "severity": "Critical",
            "details": "Waterlogging up to 4 feet in residential blocks."
        }
    ],
    "recommended_resources": [
        "NDRF & SDRF Rescue Squads",
        "Motorized Inflatable Boats",
        "Dewatering Pump Sets"
    ],
    "safety_measures": [
        "Move immediately to upper floors or official relief shelters",
        "Avoid touching electrical poles"
    ],
    "incident_report": "CRITICAL INCIDENT BRIEFING...",
    "sources": [
        "https://ndma.gov.in/latest-bulletin-chennai-flood"
    ]
}
```

---

## 🛡️ License
Distributed under the MIT License.
