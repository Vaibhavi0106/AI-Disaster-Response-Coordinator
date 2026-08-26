import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Application configuration management."""
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "default-dev-secret-key-eoc-2026")
    PORT = int(os.getenv("FLASK_PORT", 5000))
    DEBUG = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "t")

    # API Keys
    TAVILY_API_KEY = os.getenv("TAVILY_API_KEY", "").strip()
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
    OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "").strip()

    
    # Emergency SOS Webhook
    N8N_SOS_WEBHOOK_URL = os.getenv("N8N_SOS_WEBHOOK_URL", "").strip()

    # Check live API status
    IS_LIVE_API_AVAILABLE = bool(TAVILY_API_KEY and OPENAI_API_KEY)

