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
    role: str                 # admin | organization | doctor
    organization_id: Optional[str] = None
    doctor_id: Optional[str] = None
    intent: str               # "summary" | "doctor_breakdown" | "forecast"
    period: str = "monthly"   # daily | weekly | monthly


class RevenueResponse(BaseModel):
    role: str
    period: str
    summary: Optional[dict] = None
    breakdown: Optional[List[dict]] = None
    insights: Optional[List[str]] = None
    message: str
    timestamp: str


# ==========================================================
# 2. MOCK REVENUE DATA (REPLACE WITH DB LATER)
# ==========================================================

REVENUE_DATA = {
    "ORG_1001": {
        "currency": "INR",
        "doctors": {
            "DOC_101": {
                "name": "Dr. Ali",
                "appointments": 120,
                "avg_fee": 1500
            },
            "DOC_102": {
                "name": "Dr. Sara",
                "appointments": 90,
                "avg_fee": 2000
            }
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
        insights = []

        if not breakdown:
            return insights

        top_doctor = max(breakdown, key=lambda x: x["revenue"])
        insights.append(
            f"🏆 Top performing doctor: {top_doctor['doctor_name']} "
            f"with revenue {top_doctor['revenue']}."
        )

        low_perf = min(breakdown, key=lambda x: x["appointments"])
        insights.append(
            f"⚠️ Low appointment volume detected for "
            f"{low_perf['doctor_name']}."
        )

        return insights

    @staticmethod
    def forecast_next_period(total_revenue: int) -> int:
        # Simple conservative forecast (+10%)
        return int(total_revenue * 1.10)


# ==========================================================
# 4. REVENUE AGENT (PROFESSIONAL)
# ==========================================================

class RevenueAgent(BaseAgent):
    """
    Revenue Agent
    --------------
    ✔ Doctor / Org / Admin analytics
    ✔ Revenue breakdown
    ✔ Business insights
    ✔ Forecasting ready
    ✔ Router compatible
    """

    def __init__(self):
        super().__init__("revenue")

    async def handle(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = RevenueInput(**payload)

        if data.role not in ["admin", "organization", "doctor"]:
            return RevenueResponse(
                role=data.role,
                period=data.period,
                message="Invalid role for revenue access.",
                timestamp=datetime.utcnow().isoformat()
            ).dict()

        org_data = REVENUE_DATA.get(data.organization_id)
        if not org_data:
            return RevenueResponse(
                role=data.role,
                period=data.period,
                message="Revenue data not found.",
                timestamp=datetime.utcnow().isoformat()
            ).dict()

        currency = org_data["currency"]
        doctors = org_data["doctors"]

        breakdown = []
        total_revenue = 0

        for doc_id, info in doctors.items():
            revenue = RevenueIntelligence.calculate_doctor_revenue(
                info["appointments"],
                info["avg_fee"]
            )
            total_revenue += revenue

            breakdown.append({
                "doctor_id": doc_id,
                "doctor_name": info["name"],
                "appointments": info["appointments"],
                "revenue": revenue,
                "currency": currency
            })

        # -------------------------------
        # INTENT: SUMMARY
        # -------------------------------
        if data.intent == "summary":
            self.log_action("revenue_summary", payload)
            return RevenueResponse(
                role=data.role,
                period=data.period,
                summary={
                    "total_revenue": total_revenue,
                    "currency": currency,
                    "doctor_count": len(doctors)
                },
                message="Revenue summary generated.",
                timestamp=datetime.utcnow().isoformat()
            ).dict()

        # -------------------------------
        # INTENT: DOCTOR BREAKDOWN
        # -------------------------------
        if data.intent == "doctor_breakdown":
            insights = RevenueIntelligence.generate_insights(breakdown)

            self.log_action("revenue_breakdown", payload)

            return RevenueResponse(
                role=data.role,
                period=data.period,
                breakdown=breakdown,
                insights=insights,
                message="Doctor-wise revenue breakdown generated.",
                timestamp=datetime.utcnow().isoformat()
            ).dict()

        # -------------------------------
        # INTENT: FORECAST
        # -------------------------------
        if data.intent == "forecast":
            forecast = RevenueIntelligence.forecast_next_period(total_revenue)

            self.log_action("revenue_forecast", payload)

            return RevenueResponse(
                role=data.role,
                period=data.period,
                summary={
                    "current_revenue": total_revenue,
                    "forecast_next_period": forecast,
                    "currency": currency
                },
                message="Revenue forecast generated.",
                timestamp=datetime.utcnow().isoformat()
            ).dict()

        return RevenueResponse(
            role=data.role,
            period=data.period,
            message="Unknown revenue intent.",
            timestamp=datetime.utcnow().isoformat()
        ).dict()
