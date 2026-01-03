from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# --- AUTH ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str
    gender: Optional[str] = None
    age: Optional[int] = None
    address: Optional[str] = None
    pincode: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    hospital_name: Optional[str] = None
    scheduling_config: Optional[dict] = None

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    phone_number: Optional[str] = None
    is_email_verified: bool

    class Config:
        orm_mode = True

class VerifyOTP(BaseModel):
    email: str
    otp: str

class Login(BaseModel):
    username: str
    password: str

# --- PROFILE UPDATE ---
class UserProfileUpdate(BaseModel):
    full_name: str
    email: str
    phone_number: Optional[str] = None
    address: Optional[str] = None 

class LocationUpdate(BaseModel):
    address: str
    pincode: str
    lat: float
    lng: float

# --- DOCTOR JOINING ---
class DoctorJoinRequest(BaseModel):
    hospital_id: int
    specialization: str
    license_number: str

# --- APPOINTMENTS ---
class AppointmentCreate(BaseModel):
    doctor_id: int
    date: str
    time: str
    reason: str

class AppointmentOut(BaseModel):
    id: int
    doctor_id: int
    patient_id: int
    start_time: datetime
    status: str
    treatment_type: str

    class Config:
        orm_mode = True