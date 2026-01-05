from sqlalchemy.orm import Session
import models
from datetime import datetime

class AppointmentTools:
    def __init__(self, db: Session):
        self.db = db

    def get_available_doctors(self):
        doctors = self.db.query(models.Doctor).filter(models.Doctor.is_verified == True).all()
        return [{"id": d.id, "name": d.user.full_name, "specialization": d.specialization} for d in doctors]

    def check_slot_availability(self, doctor_id: int, date_str: str, time_str: str) -> bool:
        try:
            start_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %I:%M %p")
        except:
            return False # Invalid format
            
        existing = self.db.query(models.Appointment).filter(
            models.Appointment.doctor_id == doctor_id,
            models.Appointment.start_time == start_dt,
            models.Appointment.status.in_(["confirmed", "blocked"])
        ).first()
        
        return existing is None

    def book_slot(self, patient_id: int, doctor_id: int, date_str: str, time_str: str, reason: str):
        if not self.check_slot_availability(doctor_id, date_str, time_str):
            return {"success": False, "message": "Slot unavailable"}

        start_dt = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %I:%M %p")
        
        # Find Patient Record ID from User ID
        patient = self.db.query(models.Patient).filter(models.Patient.user_id == patient_id).first()
        if not patient: return {"success": False, "message": "Patient profile not found"}

        new_appt = models.Appointment(
            doctor_id=doctor_id,
            patient_id=patient.id,
            start_time=start_dt,
            status="confirmed",
            treatment_type=reason,
            notes="Booked via AI Agent"
        )
        self.db.add(new_appt)
        self.db.commit()
        return {"success": True, "appointment_id": new_appt.id}