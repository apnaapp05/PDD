# backend/agents/router.py

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal
from services.llm_service import llm_client

# --- IMPORT AGENTS ---
from agents.appointment.orchestrator import AppointmentAgent
from agents.inventory.orchestrator import InventoryAgent
from agents.revenue_agent import RevenueAgent  
from agents.case_agent import CaseAgent        

agent_router = APIRouter(prefix="/api/agent", tags=["AI Agents"])

class ChatRequest(BaseModel):
    message: str
    user_id: int
    user_role: str 
    agent_type: str | None = None 
    context: dict = {} 

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@agent_router.post("/chat")
async def chat_with_agent(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Smart Router: Sends user to the right agent based on keywords or selection.
    """
    user_query = request.message.lower()
    selected_agent = None

    # 1. EXPLICIT ROUTING (Frontend Selector)
    if request.agent_type:
        if request.agent_type == "finance": selected_agent = RevenueAgent()
        elif request.agent_type == "inventory": selected_agent = InventoryAgent(db)
        elif request.agent_type == "case": selected_agent = CaseAgent()
        elif request.agent_type == "appointment": selected_agent = AppointmentAgent(db)

    # 2. IMPLICIT ROUTING (Keyword Matching)
    if not selected_agent:
        # --- KEYWORDS ---
        appt_kw = ["book", "appointment", "schedule", "slot", "visit", "consult", "reservation", "booking", "availability", "available", "time", "date", "calendar", "meet", "see a doctor", "reschedule", "cancel", "change time", "when", "doctor"]
        inv_kw = ["stock", "inventory", "supply", "order", "item", "product", "material", "quantity", "count", "store", "warehouse", "shortage", "low", "buy", "purchase", "equipment", "expiry", "glove", "mask", "syringe", "kit", "have", "do we have"]
        rev_kw = ["revenue", "profit", "bill", "invoice", "earning", "income", "earn", "sales", "finance", "money", "cost", "price", "payment", "paid", "due", "collection", "report", "statement", "business", "cash", "make", "made"]
        case_kw = ["case", "treatment", "pain", "swelling", "diagnosis", "prescription", "medical", "history", "symptom", "problem", "issue", "tooth", "teeth", "molar", "cavity", "filling", "root canal", "extraction", "surgery", "hurt", "ache"]

        if any(k in user_query for k in appt_kw): selected_agent = AppointmentAgent(db)
        elif any(k in user_query for k in inv_kw): selected_agent = InventoryAgent(db)
        elif any(k in user_query for k in rev_kw): selected_agent = RevenueAgent()
        elif any(k in user_query for k in case_kw): selected_agent = CaseAgent()

    # 3. PROCESS REQUEST
    if selected_agent:
        # Check if agent is "Smart" (async handle) or "Legacy" (sync process)
        if hasattr(selected_agent, "handle"):
            payload = {
                "user_query": request.message,
                "user_id": request.user_id,
                "role": request.user_role,
                "patient_id": str(request.user_id),
                "organization_id": "ORG_1001"
            }
            response = await selected_agent.handle(payload)
            final_text = response.get("message") or response.get("response_text") or str(response)
            return {"response": final_text, "action_taken": response.get("action_taken", "processed"), "data": response}
        else:
            return selected_agent.process(user_query, request.user_id, request.user_role)

    # 4. FALLBACK (General Chat)
    return {
        "response": llm_client.generate_response(f"Answer this as a helpful dental assistant: {request.message}"),
        "action_taken": None
    }