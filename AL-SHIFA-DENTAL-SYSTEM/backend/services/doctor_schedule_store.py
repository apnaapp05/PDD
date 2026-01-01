# backend/services/doctor_schedule_store.py

from services.doctor_schedule_ai import DoctorScheduleConfig

# TEMP in-memory store (replace with DB later)
DOCTOR_SCHEDULE_STORE = {}

def save_schedule(doctor_id: str, config: DoctorScheduleConfig):
    DOCTOR_SCHEDULE_STORE[doctor_id] = config

def get_schedule_for_doctor(doctor_id: str):
    return DOCTOR_SCHEDULE_STORE.get(doctor_id)
