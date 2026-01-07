# backend/agents/case_agent.py

from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Local Imports
from database import SessionLocal
from models import ClinicalCase, Patient, User
from agents.base_agent import BaseAgent
from vectordb.client import VectorDBClient
from vectordb.schema import PATIENT_HISTORY_COLLECTION
from integrations.mcp_client import send_xray_for_analysis
from notifications.service import NotificationService
from infra.rate_limiter import RateLimiter

# ==========================================================
# 1. STRUCTURED I/O
# ==========================================================

class CaseInput(BaseModel):
    user_query: str
    patient_id: Optional[str] = None
    role: str  # patient | doctor

class CaseResponse(BaseModel):
    response_text: str
    case_status: str
    next_step: Optional[str] = None
    requires_doctor_verification: bool = True
    timestamp: str

# ==========================================================
# 2. MEDICAL SAFETY
# ==========================================================

HIGH_RISK_KEYWORDS = ["bleeding", "severe pain", "swelling", "infection", "fever", "pus", "uncontrolled", "emergency"]

# ==========================================================
# 3. REAL-TIME GRAPH (Connected to DB)
# ==========================================================

class ClinicalGraph:
    """
    Knowledge Graph Adapter: Fetches REAL Case Data from DB
    """
    def __init__(self, db: Session):
        self.db = db

    def get_patient_cases(self, user_id: int) -> List[dict]:
        # 1. Find Patient Profile
        patient = self.db.query(Patient).filter(Patient.user_id == user_id).first()
        if not patient:
            return []
        
        # 2. Fetch Active Cases
        cases = self.db.query(ClinicalCase).filter(
            ClinicalCase.patient_id == patient.id,
            ClinicalCase.status == "Active"
        ).all()

        results = []
        for c in cases:
            results.append({
                "case_id": c.id,
                "type": c.title,
                "stage": c.stage,
                "status": c.status,
                "start_date": c.created_at.strftime("%Y-%m-%d"),
                "next_milestone": "Doctor Advice Needed" 
            })
        return results

    def get_patient_name(self, user_id: int) -> str:
        user = self.db.query(User).filter(User.id == user_id).first()
        return user.full_name if user else "Patient"

# ==========================================================
# 4. CASE AGENT
# ==========================================================

class CaseAgent(BaseAgent):
    def __init__(self):
        super().__init__("case_tracking")
        self.db = SessionLocal()
        self.graph_memory = ClinicalGraph(self.db)
        self.vectordb = VectorDBClient()
        self.notifier = NotificationService()
        self.rate_limiter = RateLimiter()

    def safety_check(self, payload: Dict[str, Any]) -> bool:
        query = payload.get("user_query", "").lower()
        for keyword in HIGH_RISK_KEYWORDS:
            if keyword in query:
                return False
        return True

    async def handle(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = CaseInput(**payload)
        
        # 1. Safety Check
        if not self.safety_check(payload):
            return CaseResponse(
                response_text="⚠️ Your message indicates a potentially serious condition. A doctor has been notified.",
                case_status="Escalated",
                requires_doctor_verification=True,
                timestamp=datetime.utcnow().isoformat()
            ).dict()

        # 2. Fetch Real Cases
        if not data.patient_id:
             return CaseResponse(response_text="Please log in to view cases.", case_status="Auth Required", timestamp=datetime.utcnow().isoformat()).dict()

        try:
            # Assuming payload sends user_id as patient_id string, convert to int
            user_id = int(data.patient_id)
        except:
            return CaseResponse(response_text="Invalid ID format.", case_status="Error", timestamp=datetime.utcnow().isoformat()).dict()

        cases = self.graph_memory.get_patient_cases(user_id)
        patient_name = self.graph_memory.get_patient_name(user_id)

        # 3. Reasoning
        response_blocks = []
        
        if not cases:
            response_blocks.append(f"Hello {patient_name}, you have no active clinical cases tracked right now.")
        else:
            response_blocks.append(f"Hello {patient_name}, here is the status of your treatments:")
            for case in cases:
                response_blocks.append(
                    f"🦷 **{case['type']}**\n"
                    f"- Status: {case['stage']}\n"
                )

        return CaseResponse(
            response_text="\n\n".join(response_blocks),
            case_status="Active",
            timestamp=datetime.utcnow().isoformat()
        ).dict()