from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal
from services.llm_service import llm_client
from agents.appointment.orchestrator import AppointmentAgent
from agents.inventory.orchestrator import InventoryAgent
# Import other agents as we build them...

agent_router = APIRouter(prefix="/api/agent", tags=["AI Agents"])

class ChatRequest(BaseModel):
    message: str
    user_id: int
    user_role: str # 'patient', 'doctor', 'organization'
    context: dict = {} # e.g., { "current_page": "/appointments" }

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@agent_router.post("/chat")
async def chat_with_agent(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Central AI entry point. Routes user query to the correct specialized agent.
    """
    user_query = request.message.lower()
    
    # 1. INTENT CLASSIFICATION (Simple keyword routing for speed)
    # In a production app, we would ask the LLM "Which agent handles this?"
    
    selected_agent = None
    
    if any(k in user_query for k in ["book", "appointment", "schedule", "visit", "availability", "slot"]):
        selected_agent = AppointmentAgent(db)
    elif any(k in user_query for k in ["stock", "inventory", "supply", "supplies", "order"]):
        selected_agent = InventoryAgent(db)
    # Add other conditions for Medical/Revenue later...
    
    # 2. PROCESS REQUEST
    if selected_agent:
        response = selected_agent.process(user_query, request.user_id, request.user_role)
        return response
    else:
        # Fallback: General Chat (Gemini direct)
        return {
            "response": llm_client.generate_response(f"Answer this as a helpful dental assistant: {request.message}"),
            "action_taken": None
        }