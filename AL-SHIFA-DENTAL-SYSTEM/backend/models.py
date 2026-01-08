# backend/models.py
from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    password_hash = Column(String)
    role = Column(String)
    is_email_verified = Column(Boolean, default=False)
    otp_code = Column(String, nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False)
    patient_profile = relationship("Patient", back_populates="user", uselist=False)
    hospital_profile = relationship("Hospital", back_populates="owner", uselist=False)

class Hospital(Base):
    __tablename__ = "hospitals"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    address = Column(String)
    pincode = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    is_verified = Column(Boolean, default=False)
    phone_number = Column(String, nullable=True)
    
    # Location change requests
    pending_address = Column(String, nullable=True)
    pending_pincode = Column(String, nullable=True)
    pending_lat = Column(Float, nullable=True)
    pending_lng = Column(Float, nullable=True)

    owner = relationship("User", back_populates="hospital_profile")
    doctors = relationship("Doctor", back_populates="hospital")
    inventory = relationship("InventoryItem", back_populates="hospital")
    treatments = relationship("Treatment", back_populates="hospital")

class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    hospital_id = Column(Integer, ForeignKey("hospitals.id"))
    specialization = Column(String)
    license_number = Column(String)
    is_verified = Column(Boolean, default=False)
    
    # NEW: Store JSON config for schedule (Start/End time, Slot duration)
    scheduling_config = Column(String, default='{"work_start_time": "09:00", "work_end_time": "17:00", "slot_duration": 30, "break_duration": 0}')

    user = relationship("User", back_populates="doctor_profile")
    hospital = relationship("Hospital", back_populates="doctors")
    appointments = relationship("Appointment", back_populates="doctor")
    medical_records = relationship("MedicalRecord", back_populates="doctor")

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)

    user = relationship("User", back_populates="patient_profile")
    appointments = relationship("Appointment", back_populates="patient")
    medical_records = relationship("MedicalRecord", back_populates="patient")
    invoices = relationship("Invoice", back_populates="patient")
    files = relationship("PatientFile", back_populates="patient")

class PatientFile(Base):
    __tablename__ = "patient_files"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    filename = Column(String)
    filepath = Column(String)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    patient = relationship("Patient", back_populates="files")

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"))
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True) # Nullable for blocked slots
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    status = Column(String, default="confirmed") 
    treatment_type = Column(String)
    notes = Column(String, nullable=True)

    doctor = relationship("Doctor", back_populates="appointments")
    patient = relationship("Patient", back_populates="appointments")
    invoice = relationship("Invoice", back_populates="appointment", uselist=False)

class MedicalRecord(Base):
    __tablename__ = "medical_records"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    doctor_id = Column(Integer, ForeignKey("doctors.id"))
    diagnosis = Column(String)
    prescription = Column(String)
    notes = Column(String, nullable=True)
    date = Column(DateTime, default=datetime.utcnow)

    patient = relationship("Patient", back_populates="medical_records")
    doctor = relationship("Doctor", back_populates="medical_records")

class InventoryItem(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"))
    name = Column(String)
    quantity = Column(Integer, default=0)
    unit = Column(String, default="pcs")
    threshold = Column(Integer, default=10)
    last_updated = Column(DateTime, default=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="inventory")
    used_in_treatments = relationship("TreatmentInventoryLink", back_populates="item")

class Treatment(Base):
    __tablename__ = "treatments"
    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"))
    name = Column(String)
    cost = Column(Float)
    description = Column(String, nullable=True)

    hospital = relationship("Hospital", back_populates="treatments")
    required_items = relationship("TreatmentInventoryLink", back_populates="treatment")

class TreatmentInventoryLink(Base):
    __tablename__ = "treatment_inventory_links"
    id = Column(Integer, primary_key=True, index=True)
    treatment_id = Column(Integer, ForeignKey("treatments.id"))
    item_id = Column(Integer, ForeignKey("inventory.id"))
    quantity_required = Column(Integer)

    treatment = relationship("Treatment", back_populates="required_items")
    item = relationship("InventoryItem", back_populates="used_in_treatments")

class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"))
    patient_id = Column(Integer, ForeignKey("patients.id"))
    amount = Column(Float)
    status = Column(String, default="pending") 
    created_at = Column(DateTime, default=datetime.utcnow)

    appointment = relationship("Appointment", back_populates="invoice")
    patient = relationship("Patient", back_populates="invoices")