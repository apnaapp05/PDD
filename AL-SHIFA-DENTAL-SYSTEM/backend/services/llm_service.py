# backend/services/llm_service.py
from google import genai
from config import GEMINI_API_KEY
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
            logger.warning("⚠️ GEMINI_API_KEY is missing")
            self.client = None
        else:
            try:
                # NEW SDK INITIALIZATION
                self.client = genai.Client(api_key=GEMINI_API_KEY)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini: {e}")
                self.client = None

    def generate_response(self, prompt: str) -> str:
        try:
            if not self.client: return "Error: AI Service not configured."
            # NEW SDK CALL
            response = self.client.models.generate_content(model='gemini-1.5-flash', contents=prompt)
            return response.text
        except Exception as e:
            logger.error(f"LLM Error: {e}")
            return "I apologize, but I am having trouble connecting to my brain right now."

llm_client = LLMService()