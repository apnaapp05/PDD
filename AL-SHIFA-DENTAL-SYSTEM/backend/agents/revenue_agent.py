# backend/agents/revenue_agent.py

from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from agents.base_agent import BaseAgent
import json

# ==========================================================
# 1. MOCK DATA (Ideally connected to DB)
# ==========================================================
REVENUE_DATA = {
    "ORG_1001": {
        "currency": "INR",
        "doctors": {
            "DOC_101": { "name": "Dr. Ali", "appointments": 120, "avg_fee": 1500 },
            "DOC_102": { "name": "Dr. Sara", "appointments": 90, "avg_fee": 2000 }
        }
    }
}

class RevenueAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="Revenue Agent", 
            instructions="""
            You are a financial analyst for a dental clinic.
            Your job is to analyze revenue data and provide insights.
            
            You have access to a dataset (REVENUE_DATA).
            When a user asks a question, determine:
            1. The Intent: 'summary', 'doctor_breakdown', or 'forecast'.
            2. The Period: 'daily', 'weekly', or 'monthly'.
            3. Specific Doctor: If they ask about a specific person.
            """
        )

    async def handle(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        user_query = payload.get("user_query", "")
        role = payload.get("role", "admin")
        
        # 1. THINK: Use LLM to understand Natural Language
        # We ask the AI to categorize the request instead of using rigid if/else keywords
        decision = self.think(user_query, context=f"User Role: {role}")
        
        # Default values
        intent = "summary"
        period = "monthly"
        
        # If LLM parsed it as a tool call (conceptual), extract params
        if decision.status == "PENDING_TOOL":
            args = decision.tool_call.get("arguments", {})
            intent = args.get("intent", "summary")
            period = args.get("period", "monthly")
        
        # 2. LOGIC: Calculate Data
        org_data = REVENUE_DATA["ORG_1001"]
        currency = org_data["currency"]
        doctors = org_data["doctors"]
        
        total_revenue = 0
        breakdown = []
        
        for doc_id, info in doctors.items():
            rev = info["appointments"] * info["avg_fee"]
            total_revenue += rev
            breakdown.append({"name": info["name"], "revenue": rev, "count": info["appointments"]})

        # 3. GENERATE RESPONSE
        response_text = ""
        
        if "forecast" in user_query.lower() or intent == "forecast":
            forecast = int(total_revenue * 1.10)
            response_text = f"Based on current trends, next month's revenue is projected to be {currency} {forecast:,} (+10%)."
            
        elif "doctor" in user_query.lower() or intent == "doctor_breakdown":
            response_text = "Here is the performance breakdown:\n"
            for doc in breakdown:
                response_text += f"- **{doc['name']}**: {currency} {doc['revenue']:,} ({doc['count']} patients)\n"
                
        else: # Default Summary
            response_text = f"Total revenue for this month is **{currency} {total_revenue:,}**."

        return {
            "response": response_text,
            "action_taken": intent,
            "data": {"total": total_revenue, "breakdown": breakdown}
        }