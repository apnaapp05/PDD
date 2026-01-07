# backend/agents/router.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal
from services.llm_service import llm_client

# --- IMPORT ALL AGENTS ---
from agents.appointment.orchestrator import AppointmentAgent
from agents.inventory.orchestrator import InventoryAgent
from agents.revenue_agent import RevenueAgent  
from agents.case_agent import CaseAgent        

agent_router = APIRouter(prefix="/api/agent", tags=["AI Agents"])

class ChatRequest(BaseModel):
    message: str
    user_id: int
    user_role: str # 'patient', 'doctor', 'organization'
    agent_type: str | None = None # <--- ADDED THIS FIELD
    context: dict = {} 

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@agent_router.post("/chat")
async def chat_with_agent(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Central AI entry point. Routes to specific agents based on frontend selection or keywords.
    """
    user_query = request.message.lower()
    selected_agent = None

    # 1. ROUTING LOGIC
    # A. Explicit Routing (Frontend Selector)
    if request.agent_type:
        if request.agent_type == "finance":
            selected_agent = RevenueAgent() # RevenueAgent doesn't need DB yet (Mock Data)
        elif request.agent_type == "inventory":
            selected_agent = InventoryAgent(db)
        elif request.agent_type == "case":
            selected_agent = CaseAgent()    # CaseAgent creates its own DB session
        elif request.agent_type == "appointment":
            selected_agent = AppointmentAgent(db)

    # B. Implicit Routing (Keyword Fallback)
    if not selected_agent:
        if any(k in user_query for k in ["book", "appointment", "schedule", "slot"]):
            selected_agent = AppointmentAgent(db)
        elif any(k in user_query for k in ["stock", "inventory", "supply", "order"]):
            selected_agent = InventoryAgent(db)
        elif any(k in user_query for k in ["revenue", "profit", "bill", "invoice", "earning", "income"]):
            selected_agent = RevenueAgent()
        elif any(k in user_query for k in ["case", "treatment", "pain", "swelling"]):
            selected_agent = CaseAgent()

    # 2. PROCESS REQUEST
    if selected_agent:
        # Detect if agent uses async 'handle' (New Standard) or sync 'process' (Old Standard)
        if hasattr(selected_agent, "handle"):
            # Prepare payload for "Smart" Agents
            payload = {
                "user_query": request.message,
                "user_id": request.user_id,
                "role": request.user_role,
                "patient_id": str(request.user_id), # For Case Agent
                "organization_id": "ORG_1001" # Mock Context for Revenue
            }
            
            # Call Agent
            response = await selected_agent.handle(payload)
            
            # Normalize Response for Frontend
            # Revenue/Case agents might return different keys, let's map them to standard 'response'
            final_text = response.get("message") or response.get("response_text") or str(response)
            
            return {
                "response": final_text,
                "action_taken": response.get("action_taken", "processed"),
                "data": response
            }
        else:
            # Old Standard (Appointment/Inventory)
            return selected_agent.process(user_query, request.user_id, request.user_role)

    # 3. FALLBACK
    return {
        "response": llm_client.generate_response(f"Answer this as a helpful dental assistant: {request.message}"),
        "action_taken": None
    }