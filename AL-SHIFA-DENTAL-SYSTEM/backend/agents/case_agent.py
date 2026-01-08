# backend/agents/case_agent.py

from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import SessionLocal
from models import ClinicalCase, Patient, User
from agents.base_agent import BaseAgent
from notifications.service import NotificationService
# Removed vector/rate_limiter/mcp imports to prevent extra crashes if files missing

class CaseInput(BaseModel):
    user_query: str
    patient_id: Optional[str] = None
    role: str 

class CaseResponse(BaseModel):
    response_text: str
    case_status: str
    next_step: Optional[str] = None
    requires_doctor_verification: bool = True
    timestamp: str

class ClinicalGraph:
    def __init__(self, db: Session):
        self.db = db

    def get_patient_cases(self, user_id: int) -> List[dict]:
        patient = self.db.query(Patient).filter(Patient.user_id == user_id).first()
        if not patient: return []
        cases = self.db.query(ClinicalCase).filter(ClinicalCase.patient_id == patient.id, ClinicalCase.status == "Active").all()
        return [{"case_id": c.id, "type": c.title, "stage": c.stage, "status": c.status} for c in cases]

    def get_patient_name(self, user_id: int) -> str:
        user = self.db.query(User).filter(User.id == user_id).first()
        return user.full_name if user else "Patient"

class CaseAgent(BaseAgent):
    def __init__(self):
        # FIX: Added instructions argument
        super().__init__(
            name="Case Tracking Agent", 
            instructions="You track clinical cases and medical history."
        )
        self.db = SessionLocal()
        self.graph_memory = ClinicalGraph(self.db)

    async def handle(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = CaseInput(**payload)
        
        # Simple Safety Check
        if any(k in data.user_query.lower() for k in ["bleeding", "severe", "emergency"]):
             return CaseResponse(response_text="⚠️ Please visit the hospital immediately.", case_status="Emergency", timestamp=datetime.utcnow().isoformat()).dict()

        if not data.patient_id:
             return CaseResponse(response_text="Please log in to view cases.", case_status="Auth Required", timestamp=datetime.utcnow().isoformat()).dict()

        try: user_id = int(data.patient_id)
        except: return CaseResponse(response_text="Invalid ID.", case_status="Error", timestamp=datetime.utcnow().isoformat()).dict()

        cases = self.graph_memory.get_patient_cases(user_id)
        name = self.graph_memory.get_patient_name(user_id)

        if not cases: msg = f"Hello {name}, you have no active cases."
        else: msg = f"Hello {name}, found {len(cases)} active cases: " + ", ".join([c['type'] for c in cases])

        return CaseResponse(response_text=msg, case_status="Active", timestamp=datetime.utcnow().isoformat()).dict()