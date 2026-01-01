from typing import Dict, Any, List, Optional
from datetime import datetime, date
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

# Local Imports
from database import SessionLocal
from models import Appointment, Doctor, Patient, User
from services.doctor_schedule_ai import SchedulerService 

# Robust Import for BaseAgent
try:
    from agents.base_agent import BaseAgent
except ImportError:
    from .base_agent import BaseAgent

# ==========================================================
# 1. INPUT SCHEMAS
# ==========================================================

class AgentInput(BaseModel):
    user_query: Optional[str] = None
    role: str = "patient"
    doctor_id: Optional[str] = None
    patient_id: Optional[str] = None
    slot_id: Optional[str] = None # Format: "DOCTORUUID_HHMM"
    date: Optional[str] = None    # YYYY-MM-DD
    intent: Optional[str] = None  # "view_slots" | "book"

# ==========================================================
# 2. THE INTELLIGENT AGENT
# ==========================================================

class AppointmentAgent(BaseAgent):
    """
    ELITE APPOINTMENT AGENT
    -----------------------
    Orchestrates the conversation between:
    1. The User (Chat/UI)
    2. The Scheduler Service (Calculation Engine)
    3. The Database (Persistence)
    """

    def __init__(self):
        super().__init__("appointment")
        self.db = SessionLocal()
        self.scheduler = SchedulerService(self.db)

    # --- FIX: Rename process_request to handle ---
    # This satisfies the abstract method requirement of BaseAgent
    async def handle(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main Business Logic. 
        Note: Logging and Safety Checks are already handled by BaseAgent.process_request() calling this.
        """
        # 1. Parse & Validate
        try:
            if isinstance(payload, dict):
                data = AgentInput(**payload)
            else:
                data = payload
        except Exception as e:
            return {"response_text": f"Error parsing request: {str(e)}", "action_taken": "error"}

        # 2. Detect Intent (Hybrid Approach)
        intent = data.intent
        if not intent:
            query = (data.user_query or "").lower()
            if "book" in query or "confirm" in query:
                intent = "book"
            else:
                intent = "view_slots"

        # 3. Execution
        if intent == "view_slots":
            return self._handle_view_slots(data)
        elif intent == "book":
            return self._handle_booking(data)
        else:
            return {"response_text": "I'm not sure if you want to book or view slots.", "action_taken": "none"}

    # ------------------------------------------------------
    # HANDLER: VIEW SLOTS
    # ------------------------------------------------------
    def _handle_view_slots(self, data: AgentInput) -> Dict[str, Any]:
        target_date = data.date or datetime.now().strftime("%Y-%m-%d")
        doctor_id = data.doctor_id

        # Auto-resolve doctor if not provided (MVP Logic: Pick first)
        if not doctor_id:
            first_doc = self.db.query(Doctor).first()
            if not first_doc:
                return {"response_text": "No doctors are registered in the system.", "action_taken": "error"}
            doctor_id = str(first_doc.id)
            doctor_name = first_doc.user.full_name
        else:
            doc = self.db.query(Doctor).filter(Doctor.id == doctor_id).first()
            doctor_name = doc.user.full_name if doc else "the doctor"

        # CALL THE SCHEDULER SERVICE
        slots = self.scheduler.get_available_slots(doctor_id, target_date)
        
        # Note: We don't need self.log_action here necessarily, BaseAgent logs success/fail
        
        if not slots:
            return {
                "response_text": f"I checked {doctor_name}'s schedule for {target_date}, but there are no openings.",
                "action_taken": "suggest_alternate_date"
            }

        return {
            "response_text": f"I found {len(slots)} available slots for {doctor_name} on {target_date}. Please select one:",
            "action_taken": "show_slots",
            "available_slots": slots, # Structured data for UI Buttons
            "context": {"doctor_id": doctor_id, "date": target_date}
        }

    # ------------------------------------------------------
    # HANDLER: BOOKING (Transactional)
    # ------------------------------------------------------
    def _handle_booking(self, data: AgentInput) -> Dict[str, Any]:
        if not data.slot_id:
            return {"response_text": "Please select a time slot first.", "action_taken": "ask_slot"}
        
        # 1. Resolve User/Patient
        patient_id = data.patient_id
        # In MVP, if patient_id is missing, we might mock it or ask for it.
        if not patient_id:
             return {"response_text": "I need your Patient ID to book this.", "action_taken": "ask_auth"}

        # 2. Parse Slot ID (Format: "UUID_HHMM")
        try:
            doc_id_part, time_part = data.slot_id.rsplit('_', 1)
            
            target_date = data.date or datetime.now().strftime("%Y-%m-%d")
            start_dt = datetime.strptime(f"{target_date} {time_part}", "%Y-%m-%d %H%M")
            
            doctor = self.db.query(Doctor).filter(Doctor.id == doc_id_part).first()
            if not doctor: raise ValueError("Doctor not found")
            
            from datetime import timedelta
            end_dt = start_dt + timedelta(minutes=doctor.slot_duration)

        except Exception as e:
            return {"response_text": "Invalid slot identifier. Please try searching again.", "action_taken": "error"}

        # 3. Double Check Availability
        existing = self.db.query(Appointment).filter(
            Appointment.doctor_id == doctor.id,
            Appointment.start_time == start_dt,
            Appointment.status != "cancelled"
        ).first()

        if existing:
            return {"response_text": "Oh no! That slot was just taken. Please pick another.", "action_taken": "retry_slot"}

        # 4. Create Appointment
        new_appt = Appointment(
            patient_id=patient_id,
            doctor_id=doctor.id,
            hospital_id=doctor.hospital_id,
            start_time=start_dt,
            end_time=end_dt,
            status="confirmed",
            reason=data.user_query or "AI Booking",
            ai_notes="Booked via Dr. AI Assistant"
        )
        
        try:
            self.db.add(new_appt)
            self.db.commit()
            
            return {
                "response_text": f"✅ Appointment Confirmed!\n\nDr. {doctor.user.full_name}\n{start_dt.strftime('%A, %d %b at %I:%M %p')}",
                "action_taken": "booking_confirmed",
                "data": {"appointment_id": str(new_appt.id)}
            }
        except Exception as e:
            self.db.rollback()
            return {"response_text": "System error while saving booking.", "action_taken": "error"}