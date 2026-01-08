from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- USER & AUTH ---
class UserBase(BaseModel):
    email: str

class UserCreate(UserBase):
    email: str
    password: str
    full_name: str
    role: str 
    hospital_name: Optional[str] = None
    address: Optional[str] = None
    pincode: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    specialization: Optional[str] = None
    license_number: Optional[str] = None

class UserOut(UserBase):
    id: int
    full_name: str
    role: str
    is_email_verified: bool
    class Config:
        orm_mode = True

class UserProfileUpdate(BaseModel):
    full_name: str
    email: str
    phone_number: str

# --- AUTH ---
class Login(BaseModel):
    username: str
    password: str

class VerifyOTP(BaseModel):
    email: str
    otp: str

# --- ORGANIZATION ---
class LocationUpdate(BaseModel):
    address: str
    pincode: str
    lat: float
    lng: float

# --- DOCTOR ---
class DoctorJoinRequest(BaseModel):
    hospital_id: int
    specialization: str
    license_number: str

# --- SCHEDULING (UPDATED) ---
class ScheduleSettings(BaseModel):
    work_start_time: str
    work_end_time: str
    slot_duration: int
    break_duration: int

class BlockSlot(BaseModel):
    date: str
    time: Optional[str] = None
    reason: str
    is_whole_day: bool = False

# --- APPOINTMENTS ---
class AppointmentCreate(BaseModel):
    doctor_id: int
    date: str
    time: str
    reason: str

# --- INVENTORY ---
class InventoryItemCreate(BaseModel):
    name: str
    quantity: int
    unit: str
    threshold: int = 10

class InventoryUpdate(BaseModel):
    quantity: int

# --- MEDICAL RECORDS ---
class RecordCreate(BaseModel):
    diagnosis: str
    prescription: str
    notes: str

# --- TREATMENTS ---
class TreatmentCreate(BaseModel):
    name: str
    cost: float
    description: Optional[str] = None

class TreatmentLinkCreate(BaseModel):
    item_id: int
    quantity: int

class InventoryItemRef(BaseModel):
    name: str
    unit: str
    class Config:
        orm_mode = True

class TreatmentLinkOut(BaseModel):
    quantity_required: int
    item: InventoryItemRef
    class Config:
        orm_mode = True

class TreatmentOut(BaseModel):
    id: int
    name: str
    cost: float
    description: Optional[str]
    required_items: List[TreatmentLinkOut] = []
    class Config:
        orm_mode = True

# --- INVOICES ---
class InvoiceOut(BaseModel):
    id: int
    amount: float
    status: str
    created_at: datetime
    patient_name: str
    treatment_type: str