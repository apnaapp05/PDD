# backend/agents/router.py

from typing import Dict, Any, Optional
import logging

# Import all specific agents
# Assuming these exist in your project structure based on previous context
from agents.appointment_agent import AppointmentAgent
from agents.inventory_agent import InventoryAgent
from agents.revenue_agent import RevenueAgent
from agents.case_agent import CaseAgent
# Medical Agent is implied to be the RAG/General chat handler
from agents.medical_agent import MedicalAgent 

logger = logging.getLogger("AgentRouter")

class AgentRouter:
    """
    ELITE INTELLIGENCE ROUTER
    -------------------------
    Acts as the central nervous system for the backend.
    
    Capabilities:
    1. Explicit Routing: Directs payload to agent if 'agent_type' is known.
    2. Intent Detection: Analyzes natural language if 'agent_type' is missing.
    3. Safety Layer: Intercepts high-risk actions before execution.
    4. Audit Logging: Tracks every AI decision.
    """

    def __init__(self):
        # Initialize the Specialist Agents
        self.agents = {
            "appointment": AppointmentAgent(),
            "inventory": InventoryAgent(),
            "revenue": RevenueAgent(),
            "case_tracking": CaseAgent(),
            "medical": MedicalAgent(), # The "General Practitioner" / RAG Agent
            "router": self # Self-reference for simple echoes if needed
        }

    async def route(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main entry point for all AI requests.
        Payload structure: { "user_query": str, "agent_type": str (opt), "role": str, ... }
        """
        user_query = payload.get("user_query", "").lower()
        agent_type = payload.get("agent_type")
        user_role = payload.get("role", "patient")

        # --- PHASE 1: TARGET RESOLUTION ---
        target_agent_key = agent_type

        # If no explicit agent is requested, use Intent Detection (Version B Logic)
        if not target_agent_key:
            target_agent_key = self._detect_intent(user_query, user_role)

        

        # --- PHASE 2: AGENT VALIDATION ---
        agent = self.agents.get(target_agent_key)
        
        if not agent:
            # Fallback if detection fails or agent missing
            return self._format_response(
                status="error",
                message=f"Could not route request. Unknown agent: {target_agent_key}",
                data={"response_text": "I'm not sure which specialist handles that. Could you rephrase?"}
            )

        # --- PHASE 3: SAFETY LAYER (Version A Logic) ---
        # Future Human-in-the-Loop (HITL) triggers go here
        if hasattr(agent, "safety_check"):
            is_safe, safety_msg = agent.safety_check(payload)
            if not is_safe:
                logger.warning(f"Safety Trigger: {safety_msg}")
                return self._format_response(
                    status="escalated",
                    message="Request flagged by safety protocols",
                    data={"response_text": safety_msg, "action_taken": "escalate_to_human"}
                )

        # --- PHASE 4: EXECUTION ---
        try:
            # Standardize execution method (some agents might use 'process' or 'handle')
            if hasattr(agent, "process_request"):
                result = await agent.process_request(payload)
            elif hasattr(agent, "process"):
                result = await agent.process(payload)
            elif hasattr(agent, "handle"):
                result = await agent.handle(payload)
            else:
                # Fallback for simple/mock agents
                result = {"response_text": "Agent acknowledged.", "action_taken": "none"}

            # --- PHASE 5: AUDIT LOGGING ---
            if hasattr(agent, "log_action"):
                agent.log_action("request_handled", {"query": user_query, "agent": target_agent_key})

            return self._format_response(
                status="success",
                agent=target_agent_key,
                data=result
            )

        except Exception as e:
            logger.error(f"Agent Execution Error: {str(e)}")
            return self._format_response(
                status="error",
                message="Internal Agent Error",
                data={"response_text": "I encountered an internal error processing your request."}
            )

    def _detect_intent(self, query: str, role: str) -> str:
        """
        NLP Logic to classify user intent into an agent key.
        """
        # 1. Appointment Intents
        booking_keywords = ["book", "appointment", "schedule", "slot", "visit", "reschedule", "cancel"]
        if any(w in query for w in booking_keywords):
            return "appointment"

        # 2. Medical/Symptom Intents (Patient focused)
        medical_keywords = ["pain", "symptom", "hurt", "bleed", "tooth", "ache", "swollen", "medicine", "advice"]
        if any(w in query for w in medical_keywords):
            return "medical"

        # 3. Admin Intents (Doctor/Admin ONLY)
        if role in ["doctor", "admin"]:
            # Inventory
            if any(w in query for w in ["stock", "inventory", "supply", "order", "quantity"]):
                return "inventory"
            
            # Revenue/Finance
            if any(w in query for w in ["revenue", "sales", "income", "profit", "finance", "report"]):
                return "revenue"
            
            # Case Tracking
            if any(w in query for w in ["lab", "status", "case", "delivery", "technician"]):
                return "case_tracking"

        # 4. Default Fallback
        # If it's a general greeting or unmatched query, send to Medical/General agent
        return "medical"

    def _format_response(self, status: str, message: str = "", agent: str = "system", data: Dict = None) -> Dict:
        """
        Standardized Response Envelope
        """
        return {
            "status": status,
            "agent_used": agent,
            "system_message": message,
            # Flatten data for easier frontend consumption, or keep nested
            "response_text": data.get("response_text", "") if data else "",
            "action_taken": data.get("action_taken", "none") if data else "none",
            "available_slots": data.get("available_slots", []) if data else [],
            "data": data # Keep full raw data accessible
        }