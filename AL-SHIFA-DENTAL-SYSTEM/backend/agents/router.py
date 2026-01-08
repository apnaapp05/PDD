# backend/agents/router.py
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal
from services.llm_service import llm_client
import logging

# IMPORT AGENTS
from agents.appointment.orchestrator import AppointmentAgent
from agents.inventory.orchestrator import InventoryAgent
from agents.revenue_agent import RevenueAgent  
from agents.case_agent import CaseAgent        

logger = logging.getLogger(__name__)
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
    try:
        user_query = request.message.lower()
        selected_agent = None

        # 1. SELECT AGENT
        if request.agent_type == "finance": selected_agent = RevenueAgent()
        elif request.agent_type == "inventory": selected_agent = InventoryAgent(db)
        elif request.agent_type == "case": selected_agent = CaseAgent()
        elif request.agent_type == "appointment": selected_agent = AppointmentAgent(db)
        
        if not selected_agent:
            # Keyword routing
            if any(k in user_query for k in ["book", "appointment", "schedule"]): selected_agent = AppointmentAgent(db)
            elif any(k in user_query for k in ["stock", "inventory", "supply"]): selected_agent = InventoryAgent(db)
            elif any(k in user_query for k in ["revenue", "earn", "profit"]): selected_agent = RevenueAgent()
            elif any(k in user_query for k in ["case", "pain", "treatment"]): selected_agent = CaseAgent()

        # 2. EXECUTE AGENT
        if selected_agent:
            if hasattr(selected_agent, "handle"):
                payload = {
                    "user_query": request.message,
                    "user_id": request.user_id,
                    "role": request.user_role,
                    "patient_id": str(request.user_id),
                    "organization_id": "ORG_1001"
                }
                response = await selected_agent.handle(payload)
                # Normalize response
                final = response.get("message") or response.get("response_text") or str(response)
                return {"response": final, "action_taken": "processed", "data": response}
            else:
                return selected_agent.process(user_query, request.user_id, request.user_role)

        # 3. FALLBACK
        return {"response": llm_client.generate_response(request.message), "action_taken": "fallback"}

    except Exception as e:
        logger.error(f"ROUTER ERROR: {str(e)}")
        return {"response": f"⚠️ Agent Error: {str(e)}", "action_taken": "error"}