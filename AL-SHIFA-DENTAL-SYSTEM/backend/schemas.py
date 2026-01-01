# backend/schemas.py
from pydantic import BaseModel, EmailStr
from typing import Optional

# --- USER & AUTH SCHEMAS ---

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str
    
    specialization: Optional[str] = None
    license_number: Optional[str] = None
    hospital_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    
    address: Optional[str] = None
    pincode: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    
    scheduling_config: Optional[dict] = None

class VerifyOTP(BaseModel):
    email: str
    otp: str

# --- APPOINTMENT SCHEMAS ---
class AppointmentCreate(BaseModel):
    doctor_id: int
    date: str  # YYYY-MM-DD
    time: str  # HH:MM AM/PM
    reason: str

# --- PROFILE UPDATE SCHEMAS ---

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None 
    phone_number: Optional[str] = None
    address: Optional[str] = None

class LocationUpdate(BaseModel):
    address: str
    pincode: str
    lat: float
    lng: float

# --- RESPONSE SCHEMAS ---

class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    phone_number: Optional[str] = None
    address: Optional[str] = None
    
    class Config:
        from_attributes = True