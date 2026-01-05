from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, Float, Text, JSON
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    full_name = Column(String)
    role = Column(String) # 'patient', 'doctor', 'organization', 'admin'
    phone_number = Column(String, nullable=True)
    is_email_verified = Column(Boolean, default=False)
    otp_code = Column(String, nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)

    patient_profile = relationship("Patient", back_populates="user", uselist=False)
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False)
    hospital_profile = relationship("Hospital", back_populates="owner", uselist=False)

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    age = Column(Integer)
    gender = Column(String)
    
    user = relationship("User", back_populates="patient_profile")
    appointments = relationship("Appointment", back_populates="patient")
    medical_records = relationship("MedicalRecord", back_populates="patient")

class Hospital(Base):
    __tablename__ = "hospitals"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    address = Column(String)
    pincode = Column(String)
    lat = Column(Float, default=0.0)
    lng = Column(Float, default=0.0)
    is_verified = Column(Boolean, default=False)
    
    pending_address = Column(String, nullable=True)
    pending_pincode = Column(String, nullable=True)
    pending_lat = Column(Float, nullable=True)
    pending_lng = Column(Float, nullable=True)

    owner = relationship("User", back_populates="hospital_profile")
    doctors = relationship("Doctor", back_populates="hospital")
    inventory = relationship("InventoryItem", back_populates="hospital")

class Doctor(Base):
    __tablename__ = "doctors"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    hospital_id = Column(Integer, ForeignKey("hospitals.id"))
    specialization = Column(String)
    license_number = Column(String)
    is_verified = Column(Boolean, default=False)
    break_duration = Column(Integer, default=0)

    user = relationship("User", back_populates="doctor_profile")
    hospital = relationship("Hospital", back_populates="doctors")
    appointments = relationship("Appointment", back_populates="doctor")
    medical_records = relationship("MedicalRecord", back_populates="doctor")

class Appointment(Base):
    __tablename__ = "appointments"
    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"))
    patient_id = Column(Integer, ForeignKey("patients.id"))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    status = Column(String, default="confirmed") 
    treatment_type = Column(String)
    notes = Column(String, nullable=True)

    doctor = relationship("Doctor", back_populates="appointments")
    patient = relationship("Patient", back_populates="appointments")

class MedicalRecord(Base):
    __tablename__ = "medical_records"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    doctor_id = Column(Integer, ForeignKey("doctors.id"))
    date = Column(DateTime, default=datetime.utcnow)
    diagnosis = Column(Text)
    prescription = Column(Text)
    notes = Column(Text, nullable=True)
    attachments = Column(JSON, nullable=True)

    patient = relationship("Patient", back_populates="medical_records")
    doctor = relationship("Doctor", back_populates="medical_records")

class InventoryItem(Base):
    __tablename__ = "inventory_items"
    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"))
    name = Column(String)
    quantity = Column(Integer, default=0)
    unit = Column(String) # e.g., 'boxes', 'vials'
    threshold = Column(Integer, default=10) # Warning level
    last_updated = Column(DateTime, default=datetime.utcnow)

    hospital = relationship("Hospital", back_populates="inventory")