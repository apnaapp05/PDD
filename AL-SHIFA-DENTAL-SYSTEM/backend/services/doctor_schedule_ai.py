# backend/services/doctor_schedule_ai.py

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
import models  # Assuming your models are in models.py

class SchedulerService:
    """
    ELITE SCHEDULING ENGINE
    -----------------------
    Handles both the configuration of doctor schedules (AI-driven)
    and the calculation of available slots (Runtime).
    """

    def __init__(self, db: Session):
        self.db = db

    # ==========================================================
    # PART 1: CONFIGURATION (From Version A)
    # ==========================================================
    def update_doctor_schedule_config(
        self, 
        doctor_user_id: str, 
        consultation_style: str = "normal", 
        wants_breaks: bool = False,
        work_start: str = "09:00",
        work_end: str = "17:00"
    ):
        """
        Updates the Doctor's profile with concrete time settings based on high-level intent.
        """
        # 1. Map Style to Duration (AI Logic)
        style_map = {
            "fast": 15,      # High volume
            "normal": 30,    # Standard checkup
            "detailed": 45,  # Comprehensive
            "surgery": 60    # Procedures
        }
        slot_duration = style_map.get(consultation_style, 30)

        # 2. Configure Breaks
        # If interleaved, we add a 5-10 min buffer between patients
        break_duration = 10 if wants_breaks else 0

        # 3. Update DB
        doctor = self.db.query(models.Doctor).filter(models.Doctor.user_id == doctor_user_id).first()
        if not doctor:
            raise ValueError("Doctor profile not found")

        doctor.slot_duration = slot_duration
        doctor.break_duration = break_duration
        doctor.work_start_time = work_start
        doctor.work_end_time = work_end
        
        self.db.commit()
        self.db.refresh(doctor)
        
        return {
            "status": "success",
            "message": f"Schedule updated: {slot_duration}min slots with {break_duration}min breaks."
        }

    # ==========================================================
    # PART 2: RUNTIME CALCULATION (From Version B)
    # ==========================================================
    def get_available_slots(self, doctor_id: str, date_str: str = None) -> List[Dict]:
        """
        Generates actionable slots for the Frontend/Chatbot.
        Excludes times that are already booked in the 'Appointment' table.
        """
        if not date_str:
            date_str = datetime.now().strftime("%Y-%m-%d")

        # 1. Fetch Doctor Config
        # Note: Accepts either UUID (PK) or User_ID, handling both for safety
        doctor = self.db.query(models.Doctor).filter(
            (models.Doctor.id == doctor_id) | (models.Doctor.user_id == doctor_id)
        ).first()
        
        if not doctor:
            return []

        # 2. Parse Working Hours
        try:
            work_start = datetime.strptime(f"{date_str} {doctor.work_start_time}", "%Y-%m-%d %H:%M")
            work_end = datetime.strptime(f"{date_str} {doctor.work_end_time}", "%Y-%m-%d %H:%M")
        except ValueError:
            # Fallback if time format is wrong
            work_start = datetime.strptime(f"{date_str} 09:00", "%Y-%m-%d %H:%M")
            work_end = datetime.strptime(f"{date_str} 17:00", "%Y-%m-%d %H:%M")

        # 3. Define Durations
        slot_delta = timedelta(minutes=doctor.slot_duration)
        break_delta = timedelta(minutes=doctor.break_duration)

        # 4. Fetch Existing Appointments (Busy Intervals)
        # We query by Doctor ID and the specific Date range
        existing_appts = self.db.query(models.Appointment).filter(
            models.Appointment.doctor_id == doctor.id,
            models.Appointment.start_time >= work_start,
            models.Appointment.start_time < work_end + timedelta(days=1), # Cover the full day
            models.Appointment.status != "cancelled"
        ).all()

        busy_intervals = []
        for appt in existing_appts:
            busy_intervals.append((appt.start_time, appt.end_time))

        # 5. Generate Slots (The "15+5" Logic)
        available_slots = []
        current_time = work_start

        # Loop until the slot would exceed work hours
        while current_time + slot_delta <= work_end:
            slot_end = current_time + slot_delta
            
            # Conflict Check
            is_conflict = False
            for busy_start, busy_end in busy_intervals:
                # Standard Overlap Formula: (StartA < EndB) and (EndA > StartB)
                if current_time < busy_end and slot_end > busy_start:
                    is_conflict = True
                    break
            
            # If no conflict, add to list
            if not is_conflict:
                # Formatting for Frontend (SlotButtons.tsx)
                available_slots.append({
                    "slot_id": f"{doctor.id}_{current_time.strftime('%H%M')}",
                    "start": current_time.strftime("%H:%M"), # "10:00"
                    "end": slot_end.strftime("%H:%M"),       # "10:30"
                    "doctor_id": str(doctor.id),
                    "doctor_name": doctor.user.full_name if doctor.user else "Dr. Verified"
                })

            # Increment: Slot Time + Break Time
            current_time = slot_end + break_delta

        return available_slots