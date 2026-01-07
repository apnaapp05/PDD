# backend/main.py

from fastapi import FastAPI, Depends, HTTPException, status, Request, APIRouter, BackgroundTasks, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import or_, func, and_
from datetime import datetime, timedelta
from jose import jwt, JWTError
import bcrypt
import random
import string
import csv
import codecs
import logging
import os
from contextlib import asynccontextmanager

import models
import database
import schemas
from notifications.email import EmailAdapter
from agents.router import agent_router 

# --- LOGGING SETUP ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- CONFIG ---
SECRET_KEY = os.getenv("SECRET_KEY", "alshifa_super_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Initialize Email Service gracefully
try:
    email_service = EmailAdapter()
except Exception as e:
    logger.warning(f"Email service failed to initialize: {e}. OTPs will be logged to console only.")
    email_service = None

# --- DATABASE & STARTUP ---
def init_db():
    models.Base.metadata.create_all(bind=database.engine)

def create_default_admin(db: Session):
    """Ensures a default admin account exists on startup."""
    admin_email = "admin@system"
    admin = db.query(models.User).filter(models.User.email == admin_email).first()
    if not admin:
        logger.info("Creating default admin account...")
        pwd_hash = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        new_admin = models.User(
            email=admin_email,
            full_name="System Admin",
            role="admin",
            is_email_verified=True,
            password_hash=pwd_hash
        )
        db.add(new_admin)
        db.commit()
        logger.info("Default admin created. Login: admin@system / admin123")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    db = database.SessionLocal()
    try:
        create_default_admin(db)
    finally:
        db.close()
    yield
    # Shutdown (if needed)

# --- UTILS ---
def get_db():
    db = database.SessionLocal()
    try: yield db
    finally: db.close()

def get_password_hash(password: str) -> str:
    try:
        pwd_bytes = password.encode('utf-8')
        if len(pwd_bytes) > 72: pwd_bytes = pwd_bytes[:72]
        return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode('utf-8')
    except Exception: return ""

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        pwd_bytes = plain_password.encode('utf-8')
        if len(pwd_bytes) > 72: pwd_bytes = pwd_bytes[:72]
        return bcrypt.checkpw(pwd_bytes, hashed_password.encode('utf-8'))
    except Exception: return False

def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None: raise HTTPException(401, "Invalid token")
    except JWTError: raise HTTPException(401, "Invalid token")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None: raise HTTPException(401, "User not found")
    return user

# --- ROUTERS ---
auth_router = APIRouter(prefix="/auth", tags=["Auth"])
admin_router = APIRouter(prefix="/admin", tags=["Admin"])
org_router = APIRouter(prefix="/organization", tags=["Organization"])
doctor_router = APIRouter(prefix="/doctor", tags=["Doctor"])
public_router = APIRouter(tags=["Public"]) 

# --- PUBLIC ROUTES ---
@public_router.get("/")
def health_check():
    return {"status": "running", "system": "Al-Shifa Dental API"}

@public_router.get("/doctors")
def get_public_doctors(db: Session = Depends(get_db)):
    doctors = db.query(models.Doctor).filter(models.Doctor.is_verified == True).all()
    results = []
    for d in doctors:
        hospital = d.hospital
        user = d.user
        results.append({
            "id": d.id,
            "full_name": user.full_name if user else "Unknown",
            "specialization": d.specialization,
            "hospital_id": hospital.id if hospital else None,
            "hospital_name": hospital.name if hospital else "Unknown",
            "location": hospital.address if hospital else "Unknown"
        })
    return results

@public_router.post("/appointments")
def create_appointment(appt: schemas.AppointmentCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "patient": raise HTTPException(403, "Only patients can book")
    patient_profile = db.query(models.Patient).filter(models.Patient.user_id == user.id).first()
    if not patient_profile: raise HTTPException(400, "Patient profile not found")
    
    doctor = db.query(models.Doctor).filter(models.Doctor.id == appt.doctor_id).first()
    if not doctor: raise HTTPException(404, "Doctor not found")

    try:
        start_dt = datetime.strptime(f"{appt.date} {appt.time}", "%Y-%m-%d %I:%M %p")
    except ValueError:
        try:
             start_dt = datetime.strptime(f"{appt.date} {appt.time}", "%Y-%m-%d %H:%M")
        except ValueError:
             raise HTTPException(400, "Invalid date/time format. Use YYYY-MM-DD and HH:MM or I:M p")
    
    if start_dt < datetime.now():
        raise HTTPException(400, "Cannot book in the past")

    end_dt = start_dt + timedelta(minutes=30)

    # CHECK OVERLAP
    existing_appt = db.query(models.Appointment).filter(
        models.Appointment.doctor_id == doctor.id,
        models.Appointment.status.in_(["confirmed", "blocked", "completed"]),
        models.Appointment.start_time < end_dt,
        models.Appointment.end_time > start_dt
    ).first()

    if existing_appt:
        status_msg = "unavailable" if existing_appt.status == "blocked" else "already booked"
        raise HTTPException(400, f"This time slot is {status_msg}. Please choose another time.")

    new_appt = models.Appointment(
        doctor_id=appt.doctor_id,
        patient_id=patient_profile.id,
        start_time=start_dt,
        end_time=end_dt,
        status="confirmed",
        treatment_type=appt.reason,
        notes="Booked via Patient Portal"
    )
    db.add(new_appt); db.commit(); db.refresh(new_appt)
    return {"message": "Appointment Booked", "id": new_appt.id}

@public_router.get("/patient/appointments")
def get_my_appointments(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "patient": raise HTTPException(403, "Patients only")
    patient_profile = db.query(models.Patient).filter(models.Patient.user_id == user.id).first()
    if not patient_profile: return []

    appointments = db.query(models.Appointment).filter(models.Appointment.patient_id == patient_profile.id).order_by(models.Appointment.start_time.desc()).all()
    result = []
    for appt in appointments:
        doc = db.query(models.Doctor).filter(models.Doctor.id == appt.doctor_id).first()
        doc_user = doc.user if doc else None
        hospital = doc.hospital if doc else None
        
        result.append({
            "id": appt.id,
            "treatment": appt.treatment_type,
            "doctor": doc_user.full_name if doc_user else "Unknown",
            "date": appt.start_time.strftime("%Y-%m-%d"),
            "time": appt.start_time.strftime("%I:%M %p"),
            "status": appt.status,
            "hospital_name": hospital.name if hospital else "Unknown",
            "hospital_address": hospital.address if hospital else "Unknown",
            "hospital_lat": hospital.lat if hospital else None,
            "hospital_lng": hospital.lng if hospital else None
        })
    return result

@public_router.put("/patient/appointments/{appt_id}/cancel")
def cancel_patient_appointment(appt_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "patient": raise HTTPException(403, "Access denied")
    patient = db.query(models.Patient).filter(models.Patient.user_id == user.id).first()
    if not patient: raise HTTPException(404, "Patient profile not found")
    appt = db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()
    if not appt: raise HTTPException(404, "Appointment not found")
    if appt.patient_id != patient.id: raise HTTPException(403, "You can only cancel your own appointments")
    if appt.status in ["cancelled", "completed"]: raise HTTPException(400, "Appointment is already cancelled or completed")
    appt.status = "cancelled"; db.commit()
    return {"message": "Appointment cancelled successfully"}

@public_router.get("/patient/records")
def get_my_records(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "patient": raise HTTPException(403, "Patients only")
    patient = db.query(models.Patient).filter(models.Patient.user_id == user.id).first()
    if not patient: return []
    records = db.query(models.MedicalRecord).filter(models.MedicalRecord.patient_id == patient.id).order_by(models.MedicalRecord.date.desc()).all()
    results = []
    for rec in records:
        doc = rec.doctor
        hospital = doc.hospital if doc else None
        results.append({
            "id": rec.id, "date": rec.date, "diagnosis": rec.diagnosis, "prescription": rec.prescription, "notes": rec.notes,
            "doctor_name": doc.user.full_name if doc and doc.user else "Unknown", "hospital_name": hospital.name if hospital else "Unknown"
        })
    return results

# --- AUTH ROUTES ---
@auth_router.get("/me", response_model=schemas.UserOut)
def get_current_user_profile(user: models.User = Depends(get_current_user)):
    return user

@auth_router.put("/profile")
def update_profile(data: schemas.UserProfileUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.full_name = data.full_name
    user.email = data.email
    user.phone_number = data.phone_number
    db.commit()
    return {"message": "Profile updated"}

@auth_router.get("/hospitals")
def get_verified_hospitals(db: Session = Depends(get_db)):
    hospitals = db.query(models.Hospital).filter(models.Hospital.is_verified == True).all()
    return [{"id": h.id, "name": h.name, "address": h.address} for h in hospitals]

@auth_router.post("/register")
def register(user: schemas.UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email_clean = user.email.lower().strip()
    existing_verified = db.query(models.User).filter(models.User.email == email_clean, models.User.is_email_verified == True).first()
    if existing_verified: raise HTTPException(400, "Email already registered")
    existing_unverified = db.query(models.User).filter(models.User.email == email_clean, models.User.is_email_verified == False).first()

    try:
        otp = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        
        # Safe Email Sending
        def send_email_safe(email, otp_code):
            if email_service:
                try:
                    email_service.send(email, "Verification", f"OTP: {otp_code}")
                except Exception as e:
                    logger.error(f"Failed to send email to {email}: {e}")
            else:
                logger.info(f"EMAIL SERVICE NOT CONFIGURED. OTP for {email}: {otp_code}")

        if existing_unverified:
            if existing_unverified.otp_expires_at and existing_unverified.otp_expires_at > datetime.utcnow():
                logger.info(f"IDEMPOTENCY: Reusing existing OTP for {email_clean}")
                otp = existing_unverified.otp_code 
            else:
                existing_unverified.otp_code = otp
                existing_unverified.otp_expires_at = expires_at
                existing_unverified.password_hash = get_password_hash(user.password)
                existing_unverified.full_name = user.full_name
                db.commit()
        else:
            hashed_pw = get_password_hash(user.password)
            new_user = models.User(email=email_clean, password_hash=hashed_pw, full_name=user.full_name, role=user.role, is_email_verified=False, otp_code=otp, otp_expires_at=expires_at)
            db.add(new_user); db.flush() 
            if user.role == "organization": db.add(models.Hospital(owner_id=new_user.id, name=user.full_name, address=user.address or "Address Pending", pincode=user.pincode or "000000", lat=user.lat or 0.0, lng=user.lng or 0.0, is_verified=False))
            elif user.role == "patient": db.add(models.Patient(user_id=new_user.id, age=user.age or 0, gender=user.gender))
            elif user.role == "doctor":
                if not user.hospital_name: db.rollback(); raise HTTPException(400, "Hospital name required")
                hospital = db.query(models.Hospital).filter(models.Hospital.name == user.hospital_name).first()
                if not hospital: db.rollback(); raise HTTPException(400, "Hospital not found")
                db.add(models.Doctor(user_id=new_user.id, hospital_id=hospital.id, specialization=user.specialization, license_number=user.license_number, is_verified=False))
            db.commit()
        
        logger.info(f"REGISTER SUCCESS | Email: {email_clean} | OTP Generated")
        background_tasks.add_task(send_email_safe, email_clean, otp)
        return {"message": "OTP sent", "email": email_clean}
    except Exception as e: 
        db.rollback()
        logger.error(f"Registration Error: {str(e)}")
        raise HTTPException(500, f"Error: {str(e)}")

@auth_router.post("/verify-otp")
def verify_otp(data: schemas.VerifyOTP, db: Session = Depends(get_db)):
    email_clean = data.email.lower().strip()
    user = db.query(models.User).filter(models.User.email == email_clean).first()
    if not user: raise HTTPException(400, "User not found")
    
    # If already verified, just return success
    if user.is_email_verified: 
        return {"message": "Already verified", "status": "active", "role": user.role}
        
    if user.otp_expires_at and datetime.utcnow() > user.otp_expires_at: raise HTTPException(400, "OTP has expired. Please register again.")
    
    # Check OTP (Loose check for string/int differences)
    if str(user.otp_code).strip() != str(data.otp.strip()): 
        raise HTTPException(400, "Invalid OTP code")
        
    user.is_email_verified = True
    user.otp_code = None
    db.commit()
    return {"message": "Verified", "status": "active", "role": user.role}

@auth_router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    username = form_data.username.lower().strip()
    user = db.query(models.User).filter(models.User.email == username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash): 
        raise HTTPException(403, "Invalid Credentials")
    
    if not user.is_email_verified: 
        raise HTTPException(403, "Email not verified")
        
    if user.role == "organization":
        h = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
        if h and not h.is_verified: raise HTTPException(403, "Account pending approval")
    
    if user.role == "doctor":
        d = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
        if d and not d.is_verified: raise HTTPException(403, "Account pending approval")
        
    return {"access_token": create_access_token({"sub": str(user.id), "role": user.role}), "token_type": "bearer", "role": user.role}

# --- ADMIN ROUTES ---
@admin_router.get("/stats")
def get_admin_stats(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(403, "Admin only")
    return {
        "doctors": db.query(models.Doctor).count(),
        "patients": db.query(models.Patient).count(),
        "organizations": db.query(models.Hospital).count(),
        "revenue": 0 # Placeholder for platform revenue
    }

@admin_router.get("/doctors")
def get_all_doctors(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(403, "Admin only")
    doctors = db.query(models.Doctor).all()
    return [{
        "id": d.id, 
        "name": d.user.full_name if d.user else "Unknown",
        "email": d.user.email if d.user else "", 
        "specialization": d.specialization, 
        "license": d.license_number, 
        "is_verified": d.is_verified,
        "hospital_name": d.hospital.name if d.hospital else "N/A"
    } for d in doctors]

@admin_router.get("/organizations")
def get_all_organizations(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(403, "Admin only")
    orgs = db.query(models.Hospital).all()
    return [{
        "id": h.id, 
        "name": h.name, 
        "address": h.address, 
        "owner_email": h.owner.email if h.owner else "",
        "is_verified": h.is_verified,
        "doctor_count": len(h.doctors)
    } for h in orgs]

@admin_router.get("/patients")
def get_all_patients(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(403, "Admin only")
    patients = db.query(models.Patient).all()
    return [{
        "id": p.id,
        "name": p.user.full_name if p.user else "Unknown",
        "email": p.user.email if p.user else "",
        "age": p.age,
        "gender": p.gender,
        "created_at": p.user.created_at.strftime("%Y-%m-%d") if p.user else "N/A"
    } for p in patients]

@admin_router.delete("/delete/{type}/{id}")
def delete_entity(type: str, id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(403, "Admin only")
    
    try:
        if type == "doctor":
            record = db.query(models.Doctor).filter(models.Doctor.id == id).first()
            if not record: raise HTTPException(404, "Doctor not found")
            user_account = record.user
            db.delete(record) # Delete profile
            if user_account: db.delete(user_account) # Delete login
            
        elif type == "organization":
            record = db.query(models.Hospital).filter(models.Hospital.id == id).first()
            if not record: raise HTTPException(404, "Organization not found")
            user_account = record.owner
            db.delete(record)
            if user_account: db.delete(user_account)
            
        elif type == "patient":
            record = db.query(models.Patient).filter(models.Patient.id == id).first()
            if not record: raise HTTPException(404, "Patient not found")
            user_account = record.user
            db.delete(record)
            if user_account: db.delete(user_account)
            
        else: raise HTTPException(400, "Invalid type")
        
        db.commit()
        return {"message": "Deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Delete failed: {str(e)}")

# Keep existing approve endpoint
@admin_router.post("/approve-account/{entity_id}")
def approve_account(entity_id: int, type: str = Query(...), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(403, "Admin only")
    if type == "organization":
        hospital = db.query(models.Hospital).filter(models.Hospital.id == entity_id).first()
        if hospital:
            if hospital.pending_address: hospital.address, hospital.pincode, hospital.lat, hospital.lng, hospital.pending_address = hospital.pending_address, hospital.pending_pincode, hospital.pending_lat, hospital.pending_lng, None
            hospital.is_verified = True; db.commit(); return {"message": "Approved"}
    elif type == "doctor":
        d = db.query(models.Doctor).filter(models.Doctor.id == entity_id).first(); 
        if d: d.is_verified = True; db.commit(); return {"message": "Approved"}
    raise HTTPException(404, "Not found")

# --- ORGANIZATION ROUTES ---
@org_router.get("/details")
def get_org_details(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "organization": raise HTTPException(403, "Access denied")
    hospital = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
    if not hospital: raise HTTPException(404, "Hospital not found")
    return hospital

@org_router.post("/location-change")
def request_location_change(data: schemas.LocationUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "organization": raise HTTPException(403, "Access denied")
    hospital = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
    if not hospital: raise HTTPException(404, "Hospital not found")
    hospital.pending_address = data.address; hospital.pending_pincode = data.pincode; hospital.pending_lat = data.lat; hospital.pending_lng = data.lng
    db.commit()
    return {"message": "Location update requested"}

@org_router.get("/stats")
def get_org_dashboard_stats(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "organization": raise HTTPException(403, "Access denied")
    hospital = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
    if not hospital: return {"total_doctors": 0, "total_patients": 0, "total_revenue": 0, "utilization_rate": 0, "recent_activity": []}
    doctors = db.query(models.Doctor).filter(models.Doctor.hospital_id == hospital.id).all()
    doctor_ids = [d.id for d in doctors]
    appointments = db.query(models.Appointment).filter(models.Appointment.doctor_id.in_(doctor_ids)).all()
    confirmed = [a for a in appointments if a.status in ["confirmed", "completed"]]
    return {"total_doctors": len(doctors), "total_patients": db.query(models.Appointment).filter(models.Appointment.doctor_id.in_(doctor_ids)).distinct(models.Appointment.patient_id).count(), "total_revenue": len(confirmed) * 1500, "utilization_rate": 85, "recent_activity": []}

@org_router.get("/doctors")
def get_org_doctors(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "organization": raise HTTPException(403, "Access denied")
    hospital = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
    if not hospital: return []
    doctors = db.query(models.Doctor).filter(models.Doctor.hospital_id == hospital.id).all()
    return [{"id": d.id, "full_name": d.user.full_name, "email": d.user.email, "specialization": d.specialization, "license": d.license_number, "status": "Verified" if d.is_verified else "Pending Approval"} for d in doctors]

@org_router.post("/doctors/{doctor_id}/verify")
def verify_doctor(doctor_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "organization": raise HTTPException(403, "Access denied")
    hospital = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
    doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id, models.Doctor.hospital_id == hospital.id).first()
    if not doctor: raise HTTPException(404, "Doctor not found")
    doctor.is_verified = True; db.commit()
    return {"message": "Verified"}

@org_router.delete("/doctors/{doctor_id}")
def remove_doctor(doctor_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "organization": raise HTTPException(403, "Access denied")
    hospital = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
    doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id, models.Doctor.hospital_id == hospital.id).first()
    if not doctor: raise HTTPException(404, "Doctor not found")
    db.delete(doctor); db.commit()
    return {"message": "Removed"}

@org_router.get("/appointments")
def get_all_org_appointments(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "organization": raise HTTPException(403, "Access denied")
    hospital = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
    if not hospital: return []
    doctors = db.query(models.Doctor).filter(models.Doctor.hospital_id == hospital.id).all()
    doctor_ids = [d.id for d in doctors]
    appointments = db.query(models.Appointment).filter(models.Appointment.doctor_id.in_(doctor_ids)).order_by(models.Appointment.start_time.desc()).all()
    result = []
    for appt in appointments:
        doc = db.query(models.Doctor).filter(models.Doctor.id == appt.doctor_id).first()
        pat = db.query(models.Patient).filter(models.Patient.id == appt.patient_id).first()
        pat_user = pat.user if pat else None
        result.append({"id": appt.id, "patient_name": pat_user.full_name if pat_user else "Unknown", "doctor_name": doc.user.full_name if doc else "Unknown", "date": appt.start_time.strftime("%Y-%m-%d"), "time": appt.start_time.strftime("%I:%M %p"), "treatment": appt.treatment_type, "status": appt.status})
    return result

@org_router.get("/inventory")
def get_org_inventory(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "organization": raise HTTPException(403, "Access denied")
    hospital = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
    if not hospital: return []
    return db.query(models.InventoryItem).filter(models.InventoryItem.hospital_id == hospital.id).all()

# --- DOCTOR ROUTES ---
@doctor_router.post("/treatments")
def create_treatment(data: schemas.TreatmentCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    if not doctor or not doctor.hospital_id: raise HTTPException(400, "Doctor not linked to a hospital")
    
    new_t = models.Treatment(hospital_id=doctor.hospital_id, name=data.name, cost=data.cost, description=data.description)
    db.add(new_t); db.commit(); db.refresh(new_t)
    return new_t

@doctor_router.get("/treatments", response_model=list[schemas.TreatmentOut])
def get_treatments(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    hospital_id = None
    if user.role == "organization":
        h = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
        if h: hospital_id = h.id
    elif user.role == "doctor":
        d = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
        if d: hospital_id = d.hospital_id
    if not hospital_id: return []
    return db.query(models.Treatment).filter(models.Treatment.hospital_id == hospital_id).all()

@doctor_router.post("/treatments/{treatment_id}/link-inventory")
def link_inventory(treatment_id: int, data: schemas.TreatmentLinkCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    if not doctor: raise HTTPException(403, "Access denied")

    t = db.query(models.Treatment).filter(models.Treatment.id == treatment_id, models.Treatment.hospital_id == doctor.hospital_id).first()
    if not t: raise HTTPException(404, "Treatment not found")
    
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == data.item_id, models.InventoryItem.hospital_id == doctor.hospital_id).first()
    if not item: raise HTTPException(404, "Inventory item not found")
    
    link = db.query(models.TreatmentInventoryLink).filter(models.TreatmentInventoryLink.treatment_id == t.id, models.TreatmentInventoryLink.item_id == item.id).first()
    if link: link.quantity_required = data.quantity
    else: db.add(models.TreatmentInventoryLink(treatment_id=t.id, item_id=item.id, quantity_required=data.quantity))
    db.commit()
    return {"message": "Linked successfully"}

@doctor_router.get("/patients")
def get_my_patients(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    if not doctor: return []
    appointments = db.query(models.Appointment).filter(models.Appointment.doctor_id == doctor.id).all()
    patient_ids = set(a.patient_id for a in appointments)
    results = []
    for pid in patient_ids:
        if not pid: continue
        pat = db.query(models.Patient).filter(models.Patient.id == pid).first()
        if not pat: continue
        user_info = pat.user
        last_appt = db.query(models.Appointment).filter(models.Appointment.doctor_id == doctor.id, models.Appointment.patient_id == pid, models.Appointment.status.in_(["completed", "confirmed"])).order_by(models.Appointment.start_time.desc()).first()
        last_visit = last_appt.start_time.strftime("%Y-%m-%d") if last_appt else "N/A"
        last_record = db.query(models.MedicalRecord).filter(models.MedicalRecord.patient_id == pid).order_by(models.MedicalRecord.date.desc()).first()
        condition = last_record.diagnosis if last_record else "General Checkup"
        results.append({"id": pat.id, "name": user_info.full_name, "age": pat.age, "gender": pat.gender, "last_visit": last_visit, "condition": condition, "status": "Active"})
    return results

@doctor_router.get("/dashboard")
def get_doctor_dashboard(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    if not doctor: return {"account_status": "no_profile", "today_count": 0, "total_patients": 0, "revenue": 0, "appointments": []}
    
    now = datetime.now()
    todays_appointments = db.query(models.Appointment).filter(models.Appointment.doctor_id == doctor.id, models.Appointment.start_time >= now.replace(hour=0, minute=0, second=0), models.Appointment.start_time < now.replace(hour=0, minute=0, second=0) + timedelta(days=1)).all()
    
    appt_list = []
    revenue = 0
    for appt in todays_appointments:
        pat = db.query(models.Patient).filter(models.Patient.id == appt.patient_id).first()
        pat_user = pat.user if pat else None
        appt_list.append({
            "id": appt.id, 
            "patient_name": pat_user.full_name if pat_user else "Unknown",
            "treatment": appt.treatment_type,
            "time": appt.start_time.strftime("%I:%M %p"),
            "status": appt.status
        })
        if appt.invoice: revenue += appt.invoice.amount
        elif appt.status in ["confirmed", "completed"]: revenue += 1500 

    return {"account_status": "active", "today_count": len(todays_appointments), "total_patients": db.query(models.Appointment.patient_id).filter(models.Appointment.doctor_id == doctor.id).distinct().count(), "revenue": revenue, "appointments": appt_list}

@doctor_router.get("/finance")
def get_doctor_finance(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    if not doctor: return {"total_revenue": 0, "total_pending": 0, "invoices": []}

    invoices = db.query(models.Invoice).join(models.Appointment).filter(models.Appointment.doctor_id == doctor.id).all()
    
    formatted_invoices = []
    total_pending = 0
    total_paid = 0

    for inv in invoices:
        pat = db.query(models.Patient).filter(models.Patient.id == inv.patient_id).first()
        pat_name = pat.user.full_name if pat and pat.user else "Unknown"
        appt = db.query(models.Appointment).filter(models.Appointment.id == inv.appointment_id).first()
        treatment = appt.treatment_type if appt else "N/A"

        formatted_invoices.append({
            "id": inv.id,
            "patient_name": pat_name,
            "procedure": treatment,
            "amount": inv.amount,
            "status": inv.status.capitalize(), 
            "date": inv.created_at.strftime("%Y-%m-%d")
        })

        if inv.status.lower() == "paid": total_paid += inv.amount
        else: total_pending += inv.amount

    return { "total_revenue": total_paid, "total_pending": total_pending, "invoices": formatted_invoices }

@doctor_router.post("/appointments/{id}/complete")
def complete_appointment(id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    appt = db.query(models.Appointment).filter(models.Appointment.id == id, models.Appointment.doctor_id == doctor.id).first()
    if not appt: raise HTTPException(404, "Appointment not found")
    if appt.status == "completed": return {"message": "Already completed"}

    treatment = db.query(models.Treatment).filter(models.Treatment.name == appt.treatment_type, models.Treatment.hospital_id == doctor.hospital_id).first()
    messages = []
    
    if treatment:
        missing_items = []
        for link in treatment.required_items:
            if link.item.quantity < link.quantity_required: missing_items.append(f"{link.item.name}")
        if missing_items: raise HTTPException(400, f"Insufficient Stock: {', '.join(missing_items)}")

        for link in treatment.required_items:
            link.item.quantity -= link.quantity_required
            messages.append(f"Used {link.quantity_required} {link.item.unit} of {link.item.name}")
        
        invoice = models.Invoice(appointment_id=appt.id, patient_id=appt.patient_id, amount=treatment.cost, status="pending")
        db.add(invoice)
        messages.append(f"Invoice generated: ${treatment.cost}")
    else: messages.append("Warning: Treatment not in catalog. No invoice/deduction.")

    appt.status = "completed"
    db.commit()
    return {"message": "Completed", "details": messages}

@doctor_router.get("/schedule")
def get_doctor_schedule(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    if not doctor: return []
    now = datetime.now()
    appointments = db.query(models.Appointment).filter(models.Appointment.doctor_id == doctor.id, models.Appointment.start_time >= now.replace(hour=0, minute=0, second=0)).order_by(models.Appointment.start_time).all()
    result = []
    for appt in appointments:
        pat = db.query(models.Patient).filter(models.Patient.id == appt.patient_id).first() if appt.patient_id else None
        pat_user = pat.user if pat else None
        result.append({"id": appt.id, "patient_name": pat_user.full_name if pat_user else "Unknown", "type": appt.treatment_type, "status": appt.status, "date": appt.start_time.strftime("%Y-%m-%d"), "time": appt.start_time.strftime("%I:%M %p"), "notes": appt.notes, "start_iso": appt.start_time.isoformat(), "end_iso": appt.end_time.isoformat()})
    return result

@doctor_router.post("/schedule/block")
def block_schedule_slot(data: schemas.BlockSlotCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    try:
        if data.is_whole_day:
            date_obj = datetime.strptime(data.date, "%Y-%m-%d")
            start_dt = date_obj.replace(hour=0, minute=0, second=0); end_dt = date_obj.replace(hour=23, minute=59, second=59); block_title = "Full Day Leave"
        else:
            start_dt = datetime.strptime(f"{data.date} {data.time}", "%Y-%m-%d %I:%M %p"); end_dt = start_dt + timedelta(minutes=30); block_title = "Blocked Slot"
    except ValueError: raise HTTPException(400, "Invalid date/time format")
    if start_dt < datetime.now(): raise HTTPException(400, "Cannot block past time")
    new_block = models.Appointment(doctor_id=doctor.id, patient_id=None, start_time=start_dt, end_time=end_dt, status="blocked", treatment_type=block_title, notes=data.reason)
    db.add(new_block); db.commit()
    return {"message": "Blocked successfully"}

@doctor_router.post("/join")
def join_organization(data: schemas.DoctorJoinRequest, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    if db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first(): raise HTTPException(400, "Profile exists")
    hospital = db.query(models.Hospital).filter(models.Hospital.id == data.hospital_id).first()
    if not hospital: raise HTTPException(404, "Hospital not found")
    db.add(models.Doctor(user_id=user.id, hospital_id=hospital.id, specialization=data.specialization, license_number=data.license_number, is_verified=False)); db.commit(); return {"message": "Joined"}

@doctor_router.get("/patients/{patient_id}")
def get_patient_details_for_doctor(patient_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient: raise HTTPException(404, "Patient not found")
    records = db.query(models.MedicalRecord).filter(models.MedicalRecord.patient_id == patient.id).order_by(models.MedicalRecord.date.desc()).all()
    history = []
    for r in records: history.append({"id": r.id, "date": r.date.strftime("%Y-%m-%d"), "diagnosis": r.diagnosis, "prescription": r.prescription, "doctor_name": r.doctor.user.full_name})
    return {"id": patient.id, "full_name": patient.user.full_name, "age": patient.age, "gender": patient.gender, "history": history}

@doctor_router.post("/patients/{patient_id}/records")
def add_medical_record(patient_id: int, data: schemas.RecordCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    db.add(models.MedicalRecord(patient_id=patient.id, doctor_id=doctor.id, diagnosis=data.diagnosis, prescription=data.prescription, notes=data.notes, date=datetime.utcnow()))
    db.commit()
    return {"message": "Record saved"}

@doctor_router.get("/inventory")
def get_inventory(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    if not doctor or not doctor.hospital_id: raise HTTPException(400, "No hospital linked")
    return db.query(models.InventoryItem).filter(models.InventoryItem.hospital_id == doctor.hospital_id).all()

@doctor_router.post("/inventory")
def add_inventory_item(item: schemas.InventoryItemCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    new_item = models.InventoryItem(hospital_id=doctor.hospital_id, name=item.name, quantity=item.quantity, unit=item.unit, threshold=item.threshold)
    db.add(new_item); db.commit(); db.refresh(new_item)
    return new_item

@doctor_router.post("/inventory/upload")
def upload_inventory(file: UploadFile = File(...), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    try:
        csvReader = csv.DictReader(codecs.iterdecode(file.file, 'utf-8'))
        count = 0
        for row in csvReader:
            data = {k.lower(): v for k, v in row.items()}
            if 'name' not in data or 'quantity' not in data: continue
            name = data['name'].strip()
            try: qty = int(data['quantity']); thresh = int(data.get('threshold', 10))
            except ValueError: continue 
            unit = data.get('unit', 'pcs').strip()
            existing = db.query(models.InventoryItem).filter(models.InventoryItem.hospital_id == doctor.hospital_id, models.InventoryItem.name == name).first()
            if existing: existing.quantity += qty
            else: db.add(models.InventoryItem(hospital_id=doctor.hospital_id, name=name, quantity=qty, unit=unit, threshold=thresh))
            count += 1
        db.commit()
        return {"message": f"Successfully processed {count} items"}
    except Exception as e: raise HTTPException(400, f"Invalid file format: {str(e)}")

@doctor_router.put("/inventory/{item_id}")
def update_inventory_qty(item_id: int, data: schemas.InventoryUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not item or item.hospital_id != doctor.hospital_id: raise HTTPException(404, "Item not found")
    item.quantity = max(0, item.quantity + data.quantity)
    item.last_updated = datetime.utcnow()
    db.commit()
    return {"message": "Updated", "new_quantity": item.quantity}

# --- NEW: CLINICAL CASE MANAGEMENT ---
@doctor_router.post("/cases")
def create_case(data: schemas.CaseCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    
    new_case = models.ClinicalCase(
        patient_id=data.patient_id,
        doctor_id=doctor.id,
        title=data.title,
        stage=data.stage,
        status="Active"
    )
    db.add(new_case); db.commit(); db.refresh(new_case)
    return new_case

@doctor_router.get("/cases")
def get_cases(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    
    cases = db.query(models.ClinicalCase).filter(models.ClinicalCase.doctor_id == doctor.id).all()
    
    results = []
    for c in cases:
        pat = db.query(models.Patient).filter(models.Patient.id == c.patient_id).first()
        results.append({
            "id": c.id,
            "title": c.title,
            "stage": c.stage,
            "status": c.status,
            "updated_at": c.updated_at,
            "patient_name": pat.user.full_name if pat and pat.user else "Unknown"
        })
    return results

@doctor_router.put("/cases/{case_id}")
def update_case(case_id: int, data: schemas.CaseUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    
    c = db.query(models.ClinicalCase).filter(models.ClinicalCase.id == case_id, models.ClinicalCase.doctor_id == doctor.id).first()
    if not c: raise HTTPException(404, "Case not found")
    
    c.stage = data.stage
    if data.status: c.status = data.status
    c.updated_at = datetime.utcnow()
    db.commit()
    return {"message": "Case updated"}

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(agent_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(org_router)
app.include_router(doctor_router)
app.include_router(public_router)

# Mount media directory for uploads if needed
os.makedirs("media", exist_ok=True)
app.mount("/media", StaticFiles(directory="media"), name="media")