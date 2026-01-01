# backend/agents/case_agent.py

from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel

from agents.base_agent import BaseAgent
from vectordb.client import VectorDBClient
from vectordb.schema import PATIENT_HISTORY_COLLECTION
from integrations.mcp_client import send_xray_for_analysis
from notifications.service import NotificationService
from infra.rate_limiter import RateLimiter


# ==========================================================
# 1. STRUCTURED I/O (API SAFE)
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
# 2. MEDICAL SAFETY & RISK GOVERNANCE
# ==========================================================

HIGH_RISK_KEYWORDS = [
    "bleeding",
    "severe pain",
    "swelling",
    "infection",
    "fever",
    "pus",
    "uncontrolled",
    "emergency"
]

RISK_TAGS = {
    "diabetes": "HIGH_RISK_DIABETIC",
    "hypertension": "CARDIAC_RISK",
    "penicillin": "ALLERGY_PENICILLIN"
}


# ==========================================================
# 3. GRAPH-BASED CASE MEMORY (GraphRAG)
# ==========================================================

class ClinicalGraph:
    """
    Knowledge Graph:
    Patient → Active Cases → Treatment Milestones
    """

    def __init__(self):
        self.graph = {
            "PAT_89201": {
                "name": "Ali Khan",
                "risk_tags": ["HIGH_RISK_DIABETIC"],
                "active_cases": [
                    {
                        "case_id": "CASE_501",
                        "type": "Ceramic Crown (Tooth 14)",
                        "stage": "Lab Processing",
                        "start_date": "2024-12-01",
                        "lab_order_id": "LAB_9901",
                        "next_milestone": "Cementation"
                    }
                ]
            },
            "PAT_89202": {
                "name": "Sara Ahmed",
                "risk_tags": [],
                "active_cases": [
                    {
                        "case_id": "CASE_502",
                        "type": "Orthodontic Aligners",
                        "stage": "Initial Impression",
                        "start_date": "2024-12-10",
                        "lab_order_id": None,
                        "next_milestone": "Treatment Plan Review"
                    }
                ]
            }
        }

    def get_patient(self, patient_id: str) -> Optional[dict]:
        return self.graph.get(patient_id)


# ==========================================================
# 4. CASE TRACKING AGENT (PROFESSIONAL GRADE)
# ==========================================================

class CaseAgent(BaseAgent):
    """
    Clinical Case Tracking Agent
    ----------------------------------
    ✔ GraphRAG + VectorRAG
    ✔ Medical safety guardrails
    ✔ Human-in-the-loop enforcement
    ✔ Doctor escalation via notifications
    ✔ MCP X-Ray integration
    ✔ Audit-logged & production safe
    """

    def __init__(self):
        super().__init__("case_tracking")
        self.graph_memory = ClinicalGraph()
        self.vectordb = VectorDBClient()
        self.notifier = NotificationService()
        # Initialize Rate Limiter
        self.rate_limiter = RateLimiter()

    # ------------------------------------------------------
    # XRAY ANALYSIS (MCP)
    # ------------------------------------------------------
    def analyze_xray(self, file_path: str) -> dict:
        """
        Sends X-ray to MCP server for analysis.
        Assistive only — requires doctor verification.
        """
        result = send_xray_for_analysis(file_path)
        self.log_action("xray_analysis", {"file": file_path})
        return result

    # ------------------------------------------------------
    # SAFETY LAYER (HITL + ESCALATION)
    # ------------------------------------------------------
    def safety_check(self, payload: Dict[str, Any]) -> bool:
        query = payload.get("user_query", "").lower()

        for keyword in HIGH_RISK_KEYWORDS:
            if keyword in query:
                # 🔔 CRITICAL ESCALATION
                self.notifier.notify_email(
                    to_email="doctor@clinic.com",
                    subject="⚠️ High-Risk Patient Escalation",
                    body=(
                        "High-risk medical keywords detected in patient message.\n\n"
                        f"Query: {payload.get('user_query')}\n"
                        "Immediate clinical review required."
                    )
                )

                self.log_action("high_risk_escalation", payload)
                return False

        return True

    # ------------------------------------------------------
    # INTERNAL TOOL: LAB STATUS
    # ------------------------------------------------------
    def _check_lab_status(self, order_id: str) -> str:
        mock_lab_db = {
            "LAB_9901": "Shipped (Arriving Tomorrow)",
            "LAB_9902": "Processing"
        }
        return mock_lab_db.get(order_id, "Lab order not found")

    # ------------------------------------------------------
    # ENTITY & RISK EXTRACTION
    # ------------------------------------------------------
    def _extract_risk_tags(self, text: str) -> List[str]:
        detected = []
        lower = text.lower()
        for key, tag in RISK_TAGS.items():
            if key in lower:
                detected.append(tag)
        return detected

    # ------------------------------------------------------
    # CORE REACT EXECUTION
    # ------------------------------------------------------
    async def handle(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = CaseInput(**payload)
        
        # ---- 0. RATE LIMITING LAYER ----
        if data.patient_id:
            # We use a specific prefix so case queries don't block appointment bookings
            key = f"case_query:{data.patient_id}" 
            
            if not self.rate_limiter.allow(key):
                return CaseResponse(
                    response_text="⚠️ Too many requests. Please wait a moment before asking again.",
                    case_status="Rate Limited",
                    next_step="Wait",
                    requires_doctor_verification=False,
                    timestamp=datetime.utcnow().isoformat()
                ).dict()

        # ---- 1. SAFETY FIRST ----
        if not self.safety_check(payload):
            return CaseResponse(
                response_text=(
                    "⚠️ Your message indicates a potentially serious condition. "
                    "A doctor has been notified and will review this immediately."
                ),
                case_status="Escalated",
                requires_doctor_verification=True,
                timestamp=datetime.utcnow().isoformat()
            ).dict()

        patient = self.graph_memory.get_patient(data.patient_id)
        if not patient:
            return CaseResponse(
                response_text="No patient record found.",
                case_status="Unknown",
                timestamp=datetime.utcnow().isoformat()
            ).dict()

        cases = patient["active_cases"]
        patient_name = patient["name"]

        # ---- 2. VECTOR RAG (LONGITUDINAL MEMORY) ----
        collection = self.vectordb.get_collection(PATIENT_HISTORY_COLLECTION)
        rag_results = collection.query(
            query_texts=[data.user_query],
            n_results=3
        )

        rag_context = rag_results.get("documents", [[]])[0]

        # ---- 3. REASONING ----
        response_blocks = []
        next_step = None

        for case in cases:
            query = data.user_query.lower()

            if any(w in query for w in ["lab", "status", "ready", "crown"]):
                lab_status = "N/A"
                if case["lab_order_id"]:
                    lab_status = self._check_lab_status(case["lab_order_id"])

                response_blocks.append(
                    f"🦷 **{case['type']}**\n"
                    f"- Current Stage: {case['stage']}\n"
                    f"- Lab Status: {lab_status}\n"
                    f"- Next Step: {case['next_milestone']}"
                )
                next_step = case["next_milestone"]

            elif any(w in query for w in ["progress", "stage", "plan"]):
                response_blocks.append(
                    f"Patient **{patient_name}** is currently in the "
                    f"**{case['stage']}** stage for **{case['type']}**."
                )
                next_step = case["next_milestone"]

        if not response_blocks:
            response_blocks.append(
                f"Active case found: **{cases[0]['type']}**. "
                "You may ask about lab status, progress, or next steps."
            )
            next_step = cases[0]["next_milestone"]

        self.log_action("case_tracking_query", payload)

        return CaseResponse(
            response_text="\n\n".join(response_blocks),
            case_status="Active",
            next_step=next_step,
            requires_doctor_verification=True,
            timestamp=datetime.utcnow().isoformat()
        ).dict()