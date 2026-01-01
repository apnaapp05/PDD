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

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

# --- PROFILE UPDATE SCHEMAS ---

class UserProfileUpdate(BaseModel):
    # CRITICAL FIX: Use 'str' instead of 'EmailStr' so empty strings are allowed
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