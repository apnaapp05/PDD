from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    full_name = Column(String)
    password_hash = Column(String)
    role = Column(String)  # "doctor", "patient", "organization", "admin"
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # --- PROFILE FIELDS ---
    phone_number = Column(String, nullable=True)
    address = Column(String, nullable=True)
    
    # --- SECURITY FIELDS ---
    is_email_verified = Column(Boolean, default=False)
    otp_code = Column(String, nullable=True)
    otp_expires_at = Column(DateTime, nullable=True)

    # Relationships
    # 1. User <-> Doctor (One-to-One)
    doctor_profile = relationship("Doctor", back_populates="user", uselist=False)
    
    # 2. User <-> Patient (One-to-One)
    patient_profile = relationship("Patient", back_populates="user", uselist=False)
    
    # 3. User <-> Hospital (One-to-One)
    hospital = relationship("Hospital", back_populates="owner", uselist=False)

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id")) 
    name = Column(String, index=True)
    
    address = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    
    is_verified = Column(Boolean, default=False)
    
    pending_address = Column(String, nullable=True)
    pending_pincode = Column(String, nullable=True)
    pending_lat = Column(Float, nullable=True)
    pending_lng = Column(Float, nullable=True)

    # Relationships
    owner = relationship("User", back_populates="hospital")
    doctors = relationship("Doctor", back_populates="hospital")

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    hospital_id = Column(Integer, ForeignKey("hospitals.id"))
    specialization = Column(String)
    license_number = Column(String)
    
    is_verified = Column(Boolean, default=False) 

    slot_duration = Column(Integer, default=30)
    work_start_time = Column(String, default="09:00")
    work_end_time = Column(String, default="17:00")
    break_duration = Column(Integer, default=0)

    # Relationships
    user = relationship("User", back_populates="doctor_profile")
    hospital = relationship("Hospital", back_populates="doctors")
    appointments = relationship("Appointment", back_populates="doctor")

class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    age = Column(Integer)
    gender = Column(String)
    medical_history = Column(Text, nullable=True)

    # Relationships
    # This 'user' matches User.patient_profile
    user = relationship("User", back_populates="patient_profile")
    
    # This 'appointments' matches Appointment.patient
    appointments = relationship("Appointment", back_populates="patient")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"))
    patient_id = Column(Integer, ForeignKey("patients.id"))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    status = Column(String, default="scheduled")
    
    # NEW FIELD (Required for Dashboard)
    treatment_type = Column(String, default="General Consultation")
    
    notes = Column(Text, nullable=True)

    # Relationships
    # This 'doctor' matches Doctor.appointments
    doctor = relationship("Doctor", back_populates="appointments")
    
    # CRITICAL FIX: back_populates MUST point to 'appointments' (plural) in Patient class
    patient = relationship("Patient", back_populates="appointments")