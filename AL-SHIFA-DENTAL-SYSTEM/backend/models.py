from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, Float, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    full_name = Column(String)
    role = Column(String) # "organization", "doctor", "patient", "admin"
    phone_number = Column(String, nullable=True)
    is_email_verified = Column(Boolean, default=False)
    otp_code = Column(String, nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False)
    patient_profile = relationship("Patient", back_populates="user", uselist=False)
    hospital_profile = relationship("Hospital", back_populates="owner", uselist=False)

class Hospital(Base):
    __tablename__ = "hospitals"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    address = Column(String)
    pincode = Column(String)
    lat = Column(Float)
    lng = Column(Float)
    is_verified = Column(Boolean, default=False)
    
    # Pending changes
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

    user = relationship("User", back_populates="doctor_profile")
    hospital = relationship("Hospital", back_populates="doctors")
    appointments = relationship("Appointment", back_populates="doctor")
    medical_records = relationship("MedicalRecord", back_populates="doctor")
    cases = relationship("ClinicalCase", back_populates="doctor")

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    age = Column(Integer)
    gender = Column(String)

    user = relationship("User", back_populates="patient_profile")
    appointments = relationship("Appointment", back_populates="patient")
    medical_records = relationship("MedicalRecord", back_populates="patient")
    invoices = relationship("Invoice", back_populates="patient")
    cases = relationship("ClinicalCase", back_populates="patient")

class InventoryItem(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"))
    name = Column(String)
    quantity = Column(Integer)
    unit = Column(String)
    threshold = Column(Integer, default=10)
    last_updated = Column(DateTime, default=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="inventory")
    # Link to Treatment Requirements
    treatment_links = relationship("TreatmentInventoryLink", back_populates="item")

# --- Treatment Catalog (The "Menu" of Services) ---
class Treatment(Base):
    __tablename__ = "treatments"
    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id")) # Treatments are specific to a hospital
    name = Column(String) # e.g., "Root Canal"
    cost = Column(Float)  # e.g., 1500.00
    description = Column(String, nullable=True)
    
    hospital = relationship("Hospital", back_populates="treatments")
    required_items = relationship("TreatmentInventoryLink", back_populates="treatment")

# --- The "Recipe" (Link Treatment -> Inventory) ---
class TreatmentInventoryLink(Base):
    __tablename__ = "treatment_inventory_links"
    id = Column(Integer, primary_key=True, index=True)
    treatment_id = Column(Integer, ForeignKey("treatments.id"))
    item_id = Column(Integer, ForeignKey("inventory.id"))
    quantity_required = Column(Integer) # How much to deduct (e.g., 1 or 2)

    treatment = relationship("Treatment", back_populates="required_items")
    item = relationship("InventoryItem", back_populates="treatment_links")

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"))
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    status = Column(String) # confirmed, blocked, cancelled, completed
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
    date = Column(DateTime, default=datetime.utcnow)
    diagnosis = Column(String)
    prescription = Column(String)
    notes = Column(String)

    patient = relationship("Patient", back_populates="medical_records")
    doctor = relationship("Doctor", back_populates="medical_records")

# --- Invoice System ---
class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"))
    patient_id = Column(Integer, ForeignKey("patients.id"))
    amount = Column(Float)
    status = Column(String, default="pending") # pending, paid
    created_at = Column(DateTime, default=datetime.utcnow)

    appointment = relationship("Appointment", back_populates="invoice")
    patient = relationship("Patient", back_populates="invoices")

# --- NEW: Clinical Case Tracking ---
# FIX: Inherit from Base (SQLAlchemy), NOT BaseModel (Pydantic)
class ClinicalCase(Base): 
    __tablename__ = "clinical_cases"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    doctor_id = Column(Integer, ForeignKey("doctors.id"))
    title = Column(String) # e.g. "Ceramic Crown Tooth 14"
    stage = Column(String) # e.g. "Impression Taken", "Lab Processing"
    status = Column(String, default="Active") # Active, Completed
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    patient = relationship("Patient", back_populates="cases")
    doctor = relationship("Doctor", back_populates="cases")