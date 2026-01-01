# backend/agents/medical_agent.py

from typing import Dict, Any, List, Optional
# Relative import is standard for internal package modules in FastAPI
from .base_agent import BaseAgent 

class MedicalAgent(BaseAgent):
    """
    ELITE MEDICAL AGENT (RAG-lite)
    ------------------------------
    Capabilities:
    1. Symptom Analysis: Maps raw text to clinical intent.
    2. Specialist Triage: Routes 'gum pain' -> 'Periodontist'.
    3. Context Retrieval: Uses Knowledge Base for advice.
    """

    def __init__(self):
        super().__init__("medical")
        
        # 1. SPECIALIST MAPPING (The Triage Brain)
        self.specialist_map = {
            "root canal": "Endodontist",
            "sensitivity": "Endodontist",
            "cavity": "Restorative Dentist",
            "filling": "Restorative Dentist",
            "implant": "Prosthodontist",
            "denture": "Prosthodontist",
            "braces": "Orthodontist",
            "aligner": "Orthodontist",
            "cleaning": "Hygienist",
            "gum": "Periodontist",
            "bleed": "Periodontist",
            "child": "Pediatric Dentist",
            "baby": "Pediatric Dentist",
            "wisdom": "Oral Surgeon",
            "extraction": "Oral Surgeon",
            "pain": "General Dentist" 
        }

        # 2. KNOWLEDGE BASE (Simulating Vector DB / RAG Context)
        # Note: In future phases, replace this dict with 'vectordb.client'
        self.knowledge_base = {
            "root canal": "Root canal therapy is used to save a tooth that is badly decayed or infected. It involves removing the nerve and pulp.",
            "implant": "Dental implants are metal posts or frames that are surgically positioned into the jawbone beneath your gums.",
            "braces": "Orthodontic treatment helps straighten teeth and improve bite alignment using brackets or clear aligners.",
            "gum": "Gum disease (Periodontitis) requires deep cleaning (scaling and root planing) to remove tartar buildup.",
            "wisdom": "Wisdom teeth often require extraction if they are impacted or crowding other teeth."
        }

    async def handle(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processes medical queries using a deterministic Triage + RAG approach.
        """
        query = payload.get("user_query", "").lower()
        
        # --- STEP 1: TRIAGE (Find the Specialist) ---
        detected_specialist = "General Dentist"
        detected_issue = None
        
        for keyword, specialist in self.specialist_map.items():
            if keyword in query:
                detected_issue = keyword
                detected_specialist = specialist
                break
        
        # --- STEP 2: RETRIEVAL (Simulated RAG) ---
        context_info = ""
        if detected_issue and detected_issue in self.knowledge_base:
            context_info = self.knowledge_base[detected_issue]
        
        # --- STEP 3: RESPONSE GENERATION ---
        if detected_issue:
            response_text = (
                f"Based on your symptoms ('{detected_issue}'), I recommend seeing a **{detected_specialist}**.\n\n"
                f"ℹ️ *Clinical Context:* {context_info}\n\n"
                f"Would you like to book a slot with a {detected_specialist}?"
            )
            action = "suggest_specialist"
        else:
            response_text = (
                "I couldn't pinpoint a specific condition from your description. "
                "For general discomfort, a **General Dentist** is the best starting point.\n\n"
                "Shall I look for available checkup slots?"
            )
            action = "suggest_general"

        # --- STEP 4: RETURN STRUCTURED DATA ---
        return {
            "response_text": response_text,
            "action_taken": action,
            "data": {
                "suggested_specialist": detected_specialist,
                "detected_issue": detected_issue,
                "is_emergency": False 
            }
        }