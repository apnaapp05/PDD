# backend/agents/revenue_agent.py

from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from agents.base_agent import BaseAgent

# ==========================================================
# 1. STRUCTURED I/O
# ==========================================================

class RevenueInput(BaseModel):
    agent_type: str = Field(default="revenue")
    role: str                 
    organization_id: Optional[str] = "ORG_1001" # Default for demo
    doctor_id: Optional[str] = None
    intent: str               
    period: str = "monthly"   


class RevenueResponse(BaseModel):
    role: str
    period: str
    summary: Optional[dict] = None
    breakdown: Optional[List[dict]] = None
    insights: Optional[List[str]] = None
    message: str
    timestamp: str


# ==========================================================
# 2. MOCK REVENUE DATA 
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


# ==========================================================
# 3. REVENUE INTELLIGENCE ENGINE
# ==========================================================

class RevenueIntelligence:
    @staticmethod
    def calculate_doctor_revenue(appointments: int, avg_fee: int) -> int:
        return appointments * avg_fee

    @staticmethod
    def generate_insights(breakdown: List[dict]) -> List[str]:
        if not breakdown: return []
        top_doctor = max(breakdown, key=lambda x: x["revenue"])
        return [f"🏆 Top performing doctor: {top_doctor['doctor_name']} ({top_doctor['revenue']})"]

    @staticmethod
    def forecast_next_period(total_revenue: int) -> int:
        return int(total_revenue * 1.10) # Simple +10% forecast


# ==========================================================
# 4. REVENUE AGENT
# ==========================================================

class RevenueAgent(BaseAgent):
    def __init__(self):
        # FIX: Added the missing 'instructions' argument here
        super().__init__(
            name="Revenue Agent", 
            instructions="You are a helpful financial assistant for a dental clinic. Analyze revenue data and provide summaries."
        )

    async def handle(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        
        # --- NLP LAYER: CONVERT NATURAL LANGUAGE TO INTENT ---
        # If 'intent' is missing, guess it from the user query
        if "intent" not in payload and "user_query" in payload:
            q = payload["user_query"].lower()
            
            # 1. Period Detection
            if "week" in q: payload["period"] = "weekly"
            elif "day" in q or "daily" in q or "today" in q: payload["period"] = "daily"
            else: payload["period"] = "monthly"

            # 2. Intent Detection
            if "forecast" in q or "prediction" in q or "future" in q or "next" in q or "going to be" in q:
                payload["intent"] = "forecast"
            elif "doctor" in q or "breakdown" in q or "who" in q:
                payload["intent"] = "doctor_breakdown"
            else:
                payload["intent"] = "summary"

        # Apply defaults if missing from router
        if "role" not in payload: payload["role"] = "admin"
        if "organization_id" not in payload: payload["organization_id"] = "ORG_1001"

        try:
            data = RevenueInput(**payload)
        except Exception as e:
            return {"message": f"I couldn't understand that request. Error: {str(e)}"}

        # --- LOGIC ---
        org_data = REVENUE_DATA.get(data.organization_id)
        if not org_data:
            # Fallback to default mock if specific ID not found
            org_data = REVENUE_DATA["ORG_1001"]

        currency = org_data["currency"]
        doctors = org_data["doctors"]
        breakdown = []
        total_revenue = 0

        for doc_id, info in doctors.items():
            revenue = RevenueIntelligence.calculate_doctor_revenue(info["appointments"], info["avg_fee"])
            total_revenue += revenue
            breakdown.append({
                "doctor_id": doc_id, "doctor_name": info["name"],
                "appointments": info["appointments"], "revenue": revenue
            })

        # --- RESPONSE GENERATION ---
        
        if data.intent == "summary":
            return RevenueResponse(
                role=data.role, period=data.period,
                summary={"total_revenue": total_revenue, "currency": currency},
                message=f"Total calculated revenue for this {data.period} period is {currency} {total_revenue:,}.",
                timestamp=datetime.utcnow().isoformat()
            ).dict()

        if data.intent == "doctor_breakdown":
            insights = RevenueIntelligence.generate_insights(breakdown)
            return RevenueResponse(
                role=data.role, period=data.period, breakdown=breakdown, insights=insights,
                message="Here is the breakdown by doctor.",
                timestamp=datetime.utcnow().isoformat()
            ).dict()

        if data.intent == "forecast":
            forecast = RevenueIntelligence.forecast_next_period(total_revenue)
            return RevenueResponse(
                role=data.role, period=data.period,
                summary={"current_revenue": total_revenue, "forecast_next_period": forecast, "currency": currency},
                message=f"Based on current trends, your estimated income for next {data.period.replace('ly','')} is approx {currency} {forecast:,} (+10%).",
                timestamp=datetime.utcnow().isoformat()
            ).dict()

        return {"message": "I didn't understand. Try asking about 'revenue summary', 'doctor performance', or 'income forecast'."}