# backend/services/llm_service.py
import google.generativeai as genai
from config import GEMINI_API_KEY
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        if not GEMINI_API_KEY or GEMINI_API_KEY == "YOUR_GEMINI_API_KEY_HERE":
            logger.warning("⚠️ GEMINI_API_KEY is missing in config.py")
        else:
            genai.configure(api_key=GEMINI_API_KEY)
            self.model = genai.GenerativeModel('gemini-pro')

    def generate_response(self, prompt: str) -> str:
        """
        Sends a prompt to Gemini and returns the text response.
        """
        try:
            if not GEMINI_API_KEY:
                return "Error: LLM API Key not configured."
            
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            logger.error(f"LLM Generation Error: {e}")
            return "I apologize, but I am having trouble thinking right now."

# Singleton Instance
llm_client = LLMService()