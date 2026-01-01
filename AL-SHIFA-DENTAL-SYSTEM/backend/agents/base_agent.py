# backend/agents/base_agent.py

from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple
from datetime import datetime

class BaseAgent(ABC):
    """
    ELITE AGENT BASE CLASS
    ----------------------
    Implements the 'Template Method' pattern to standardize AI behavior.
    Reference: 'Agentic Design Patterns' - Chapter 5.
    """

    def __init__(self, agent_name: str):
        self.agent_name = agent_name

    async def process_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Universal wrapper. The Router calls THIS method.
        Enforces consistent behavior across the entire AI fleet.
        """
        # 1. Safety Guardrails 
        is_safe, refusal_reason = self.safety_check(payload)
        
        if not is_safe:
            self.log_action("safety_block", {"reason": refusal_reason, "query": payload.get("user_query")})
            return {
                "response_text": refusal_reason,
                "action_taken": "escalate_to_human",
                "status": "blocked"
            }

        # 2. Execute Specific Logic
        try:
            start_time = datetime.utcnow()
            
            # Delegate to child class
            response = await self.handle(payload)
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            self.log_action("success", {
                "query": payload.get("user_query"), 
                "latency": f"{duration}s",
                "action_taken": response.get("action_taken")
            })
            
            return response

        except Exception as e:
            self.log_action("error", {"error": str(e), "trace": "BaseAgent.process_request"})
            return {
                "response_text": "I encountered an internal processing error. Please contact support.",
                "action_taken": "error",
                "debug_info": str(e)
            }

    @abstractmethod
    async def handle(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Abstract method. Child agents MUST implement this.
        """
        pass

    def safety_check(self, payload: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Global Guardrails applied to ALL agents.
        Returns: (Is_Safe: bool, Reason: str)
        """
        query = payload.get("user_query", "").lower()
        
        # Rule 1: Emergency Detection (Life Safety)
        red_flags = [
            "bleeding heavily", "unconscious", "heart attack", "stroke", 
            "can't breathe", "suicide", "overdose"
        ]
        
        if any(flag in query for flag in red_flags):
            return False, "⚠️ CRITICAL ALERT: This sounds like a medical emergency. Please call Emergency Services (911) immediately. I cannot handle life-threatening situations."

        # Rule 2: System Abuse (Basic Injection Prevention)
        abuse_flags = ["ignore previous instructions", "system prompt", "drop table"]
        if any(flag in query for flag in abuse_flags):
            return False, "I cannot process that request due to security policies."

        return True, ""

    def log_action(self, action: str, details: Dict[str, Any]):
        """
        Structured Logging for Observability.
        """
        timestamp = datetime.utcnow().isoformat()
        log_entry = f"[LOG][{timestamp}][AGENT:{self.agent_name.upper()}] action={action} details={details}"
        print(log_entry)