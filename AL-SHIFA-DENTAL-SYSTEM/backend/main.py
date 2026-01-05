# backend/main.py

from fastapi import FastAPI, Depends, HTTPException, status, Request, APIRouter, BackgroundTasks, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
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

import models
import database
import schemas
from notifications.email import EmailAdapter
from agents.router import agent_router 

# --- LOGGING SETUP ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- CONFIG ---
SECRET_KEY = "alshifa_super_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
models.Base.metadata.create_all(bind=database.engine)
email_service = EmailAdapter()

def get_db():
    db = database.SessionLocal()
    try: yield db
    finally: db.close()

# --- UTILS ---
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
             raise HTTPException(400, "Invalid date/time format")
    
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
    # 1. Clean Inputs
    email_clean = user.email.lower().strip()
    
    # 2. Check for VERIFIED account
    existing_verified = db.query(models.User).filter(
        models.User.email == email_clean, 
        models.User.is_email_verified == True
    ).first()
    
    if existing_verified:
        raise HTTPException(400, "Email already registered")

    # 3. CLEAN SLATE: Delete ALL unverified accounts with this email
    # This prevents duplicate/stale rows causing the "Invalid OTP" issue
    stale_users = db.query(models.User).filter(
        models.User.email == email_clean,
        models.User.is_email_verified == False
    ).all()
    
    if stale_users:
        logger.info(f"Cleaning up {len(stale_users)} stale unverified accounts for {email_clean}")
        for stale in stale_users:
            # Delete dependent records first to avoid Foreign Key errors
            db.query(models.Hospital).filter(models.Hospital.owner_id == stale.id).delete()
            db.query(models.Doctor).filter(models.Doctor.user_id == stale.id).delete()
            db.query(models.Patient).filter(models.Patient.user_id == stale.id).delete()
            db.delete(stale)
        db.commit() # Commit deletion

    try:
        # 4. Generate Credentials
        otp = generate_otp()
        hashed_pw = get_password_hash(user.password)
        expires_at = datetime.utcnow() + timedelta(minutes=10)

        # 5. Create NEW User
        new_user = models.User(
            email=email_clean, 
            password_hash=hashed_pw, 
            full_name=user.full_name,
            role=user.role, 
            is_email_verified=False, 
            otp_code=otp,
            otp_expires_at=expires_at
        )
        
        db.add(new_user)
        db.flush() # Get ID

        # 6. Create Profile
        if user.role == "organization":
            db.add(models.Hospital(
                owner_id=new_user.id, 
                name=user.full_name, 
                address=user.address or "Address Pending", 
                pincode=user.pincode or "000000", 
                lat=user.lat or 0.0, 
                lng=user.lng or 0.0, 
                is_verified=False
            ))
        elif user.role == "patient":
            db.add(models.Patient(
                user_id=new_user.id, 
                age=user.age or 0, 
                gender=user.gender
            ))
        elif user.role == "doctor":
            if not user.hospital_name: 
                db.rollback()
                raise HTTPException(400, "Hospital name required")
            hospital = db.query(models.Hospital).filter(models.Hospital.name == user.hospital_name).first()
            if not hospital: 
                db.rollback()
                raise HTTPException(400, "Hospital not found")
            db.add(models.Doctor(user_id=new_user.id, hospital_id=hospital.id, specialization=user.specialization, license_number=user.license_number, is_verified=False))
        
        db.commit()
        
        logger.info(f"REGISTER SUCCESS | Email: {email_clean} | OTP Saved: {otp}")
        background_tasks.add_task(email_service.send, email_clean, "Verification", f"OTP: {otp}")
        return {"message": "OTP sent", "email": email_clean}
        
    except Exception as e:
        db.rollback()
        logger.error(f"Registration Error: {str(e)}")
        raise HTTPException(500, f"Error: {str(e)}")

@auth_router.post("/verify-otp")
def verify_otp(data: schemas.VerifyOTP, db: Session = Depends(get_db)):
    email_clean = data.email.lower().strip()
    otp_input = data.otp.strip()
    
    logger.info(f"VERIFY REQUEST | Email: {email_clean} | Input: {otp_input}")
    
    user = db.query(models.User).filter(models.User.email == email_clean).first()
    
    if not user:
        raise HTTPException(400, "User not found")
    
    # Debug what is in the database vs input
    logger.info(f"DB CHECK | ID: {user.id} | OTP: {user.otp_code}")

    if user.otp_expires_at and datetime.utcnow() > user.otp_expires_at:
        db.delete(user) # Auto-cleanup expired users
        db.commit()
        raise HTTPException(400, "OTP has expired. Please register again.")
        
    if str(user.otp_code).strip() != str(otp_input):
        logger.error("OTP MISMATCH")
        raise HTTPException(400, "Invalid OTP code")
        
    user.is_email_verified = True
    user.otp_code = None
    db.commit()
    return {"message": "Verified", "status": "active", "role": user.role}

@auth_router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    username = form_data.username.lower().strip()
    if username == "myapp" and form_data.password == "asdf":
        admin = db.query(models.User).filter(models.User.email == "admin@system").first()
        if not admin:
            admin = models.User(email="admin@system", full_name="Admin", role="admin", is_email_verified=True, password_hash=get_password_hash("asdf"))
            db.add(admin); db.commit(); db.refresh(admin)
        return {"access_token": create_access_token({"sub": str(admin.id), "role": "admin"}), "token_type": "bearer", "role": "admin"}
    
    user = db.query(models.User).filter(models.User.email == username).first()
    if not user or not verify_password(form_data.password, user.password_hash): raise HTTPException(403, "Invalid Credentials")
    if not user.is_email_verified: raise HTTPException(403, "Email not verified")
    
    if user.role == "organization":
        h = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
        if h and not h.is_verified: raise HTTPException(403, "Account pending approval")
    
    if user.role == "doctor":
        d = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
        if d and not d.is_verified: raise HTTPException(403, "Account pending approval")
        
    return {"access_token": create_access_token({"sub": str(user.id), "role": user.role}), "token_type": "bearer", "role": user.role}

# --- ADMIN ROUTES ---
@admin_router.get("/pending-verifications")
def get_pending(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(403, "Admin only")
    hospitals = db.query(models.Hospital).filter(or_(models.Hospital.is_verified == False, models.Hospital.pending_address != None)).all()
    doctors = db.query(models.Doctor).filter(models.Doctor.is_verified == False).all()
    payload = []
    for h in hospitals: payload.append({"id": h.id, "name": h.name, "type": "organization", "detail": h.pending_address or h.address})
    for d in doctors: payload.append({"id": d.id, "name": d.user.full_name, "type": "doctor", "detail": d.specialization})
    return {"pending": payload}

@admin_router.post("/approve-account/{entity_id}")
def approve_account(entity_id: int, type: str = Query(...), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(403, "Admin only")
    if type == "organization":
        hospital = db.query(models.Hospital).filter(models.Hospital.id == entity_id).first()
        if hospital:
            if hospital.pending_address:
                hospital.address, hospital.pincode = hospital.pending_address, hospital.pending_pincode
                hospital.lat, hospital.lng = hospital.pending_lat, hospital.pending_lng
                hospital.pending_address = None
            hospital.is_verified = True; db.commit()
            return {"message": "Approved"}
    elif type == "doctor":
        d = db.query(models.Doctor).filter(models.Doctor.id == entity_id).first()
        if d: d.is_verified = True; db.commit(); return {"message": "Approved"}
    raise HTTPException(404, "Not found")

@admin_router.post("/reject-account/{entity_id}")
def reject_account(entity_id: int, type: str = Query(...), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(403, "Admin only")
    if type == "organization":
        h = db.query(models.Hospital).filter(models.Hospital.id == entity_id).first()
        if h: db.delete(h); db.commit()
        return {"message": "Rejected"}
    elif type == "doctor":
        d = db.query(models.Doctor).filter(models.Doctor.id == entity_id).first()
        if d: db.delete(d); db.commit()
        return {"message": "Rejected"}
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

@org_router.put("/appointments/{appt_id}/cancel")
def cancel_org_appointment(appt_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "organization": raise HTTPException(403, "Access denied")
    hospital = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
    if not hospital: raise HTTPException(404, "Hospital not found")
    appt = db.query(models.Appointment).filter(models.Appointment.id == appt_id).first()
    if not appt: raise HTTPException(404, "Appointment not found")
    doctor = db.query(models.Doctor).filter(models.Doctor.id == appt.doctor_id).first()
    if not doctor or doctor.hospital_id != hospital.id: raise HTTPException(403, "Access denied")
    appt.status = "cancelled"; db.commit()
    return {"message": "Cancelled"}

# --- DOCTOR ROUTES ---
@doctor_router.get("/dashboard")
def get_doctor_dashboard(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    if not doctor: return {"account_status": "no_profile", "today_count": 0, "total_patients": 0, "revenue": 0, "appointments": []}
    if not doctor.is_verified: return {"account_status": "pending", "today_count": 0, "total_patients": 0, "revenue": 0, "appointments": []}

    now = datetime.now()
    todays_appointments = db.query(models.Appointment).filter(models.Appointment.doctor_id == doctor.id, models.Appointment.start_time >= now.replace(hour=0, minute=0, second=0), models.Appointment.start_time < now.replace(hour=0, minute=0, second=0) + timedelta(days=1)).all()
    
    appt_list = []
    revenue = 0
    for appt in todays_appointments:
        pat = db.query(models.Patient).filter(models.Patient.id == appt.patient_id).first()
        pat_user = pat.user if pat else None
        appt_list.append({
            "id": appt.patient_id, 
            "patient_name": pat_user.full_name if pat_user else "Unknown",
            "treatment": appt.treatment_type,
            "time": appt.start_time.strftime("%I:%M %p"),
            "status": appt.status
        })
        if appt.status in ["confirmed", "completed"]: revenue += 1500

    return {"account_status": "active", "today_count": len(todays_appointments), "total_patients": db.query(models.Appointment.patient_id).filter(models.Appointment.doctor_id == doctor.id).distinct().count(), "revenue": revenue, "appointments": appt_list}

@doctor_router.get("/schedule")
def get_doctor_schedule(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    if not doctor: return []
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    appointments = db.query(models.Appointment).filter(
        models.Appointment.doctor_id == doctor.id,
        models.Appointment.start_time >= today_start
    ).order_by(models.Appointment.start_time).all()

    result = []
    for appt in appointments:
        pat = db.query(models.Patient).filter(models.Patient.id == appt.patient_id).first() if appt.patient_id else None
        pat_user = pat.user if pat else None
        result.append({
            "id": appt.id,
            "patient_name": pat_user.full_name if pat_user else "Unknown",
            "type": appt.treatment_type,
            "status": appt.status,
            "date": appt.start_time.strftime("%Y-%m-%d"),
            "time": appt.start_time.strftime("%I:%M %p"),
            "notes": appt.notes,
            "start_iso": appt.start_time.isoformat(),
            "end_iso": appt.end_time.isoformat()
        })
    return result

@doctor_router.post("/schedule/block")
def block_schedule_slot(data: schemas.BlockSlotCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Block a time slot or full day"""
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    if not doctor: raise HTTPException(404, "Doctor not found")

    try:
        if data.is_whole_day:
            date_obj = datetime.strptime(data.date, "%Y-%m-%d")
            start_dt = date_obj.replace(hour=0, minute=0, second=0)
            end_dt = date_obj.replace(hour=23, minute=59, second=59)
            block_title = "Full Day Leave"
        else:
            start_dt = datetime.strptime(f"{data.date} {data.time}", "%Y-%m-%d %I:%M %p")
            end_dt = start_dt + timedelta(minutes=30)
            block_title = "Blocked Slot"
    except ValueError:
        raise HTTPException(400, "Invalid date/time format")

    if start_dt < datetime.now(): raise HTTPException(400, "Cannot block past time")

    overlap = db.query(models.Appointment).filter(
        models.Appointment.doctor_id == doctor.id,
        models.Appointment.start_time < end_dt,
        models.Appointment.end_time > start_dt,
        models.Appointment.status == "confirmed"
    ).first()

    if overlap:
        raise HTTPException(400, "Cannot block: You have confirmed appointments during this time.")

    new_block = models.Appointment(
        doctor_id=doctor.id,
        patient_id=None,
        start_time=start_dt,
        end_time=end_dt,
        status="blocked",
        treatment_type=block_title,
        notes=data.reason
    )
    db.add(new_block); db.commit()
    return {"message": "Blocked successfully"}

@doctor_router.post("/join")
def join_organization(data: schemas.DoctorJoinRequest, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    if db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first(): raise HTTPException(400, "Profile exists")
    hospital = db.query(models.Hospital).filter(models.Hospital.id == data.hospital_id).first()
    if not hospital: raise HTTPException(404, "Hospital not found")
    db.add(models.Doctor(user_id=user.id, hospital_id=hospital.id, specialization=data.specialization, license_number=data.license_number, is_verified=False))
    db.commit(); return {"message": "Joined"}

@doctor_router.get("/patients/{patient_id}")
def get_patient_details_for_doctor(patient_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient: raise HTTPException(404, "Patient not found")
    records = db.query(models.MedicalRecord).filter(models.MedicalRecord.patient_id == patient.id).order_by(models.MedicalRecord.date.desc()).all()
    history = []
    for r in records:
        doc_user = r.doctor.user
        history.append({"id": r.id, "date": r.date.strftime("%Y-%m-%d"), "diagnosis": r.diagnosis, "prescription": r.prescription, "doctor_name": doc_user.full_name})
    return {"id": patient.id, "full_name": patient.user.full_name, "age": patient.age, "gender": patient.gender, "history": history}

@doctor_router.post("/patients/{patient_id}/records")
def add_medical_record(patient_id: int, data: schemas.RecordCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    if not doctor or not doctor.is_verified: raise HTTPException(403, "Doctor not verified")
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient: raise HTTPException(404, "Patient not found")
    record = models.MedicalRecord(patient_id=patient.id, doctor_id=doctor.id, diagnosis=data.diagnosis, prescription=data.prescription, notes=data.notes, date=datetime.utcnow())
    db.add(record)
    
    now = datetime.now()
    today_appt = db.query(models.Appointment).filter(models.Appointment.doctor_id == doctor.id, models.Appointment.patient_id == patient.id, models.Appointment.start_time >= now.replace(hour=0, minute=0), models.Appointment.start_time < now.replace(hour=0, minute=0) + timedelta(days=1), models.Appointment.status == "confirmed").first()
    if today_appt: today_appt.status = "completed"
    db.commit()
    return {"message": "Record saved"}

# --- INVENTORY ROUTES ---
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
    if not doctor or not doctor.hospital_id: raise HTTPException(400, "No hospital linked")
    
    new_item = models.InventoryItem(hospital_id=doctor.hospital_id, name=item.name, quantity=item.quantity, unit=item.unit, threshold=item.threshold)
    db.add(new_item); db.commit(); db.refresh(new_item)
    return new_item

@doctor_router.post("/inventory/upload")
def upload_inventory(file: UploadFile = File(...), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    if not doctor or not doctor.hospital_id: raise HTTPException(400, "No hospital linked")

    try:
        csvReader = csv.DictReader(codecs.iterdecode(file.file, 'utf-8'))
        count = 0
        for row in csvReader:
            data = {k.lower(): v for k, v in row.items()}
            if 'name' not in data or 'quantity' not in data: continue
            name = data['name'].strip()
            try:
                qty = int(data['quantity'])
                thresh = int(data.get('threshold', 10))
            except ValueError: continue 
            unit = data.get('unit', 'pcs').strip()
            
            existing = db.query(models.InventoryItem).filter(models.InventoryItem.hospital_id == doctor.hospital_id, models.InventoryItem.name == name).first()
            if existing: existing.quantity += qty
            else: db.add(models.InventoryItem(hospital_id=doctor.hospital_id, name=name, quantity=qty, unit=unit, threshold=thresh))
            count += 1
        db.commit()
        return {"message": f"Successfully processed {count} items"}
    except Exception as e:
        raise HTTPException(400, f"Invalid file format: {str(e)}")

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

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(agent_router)
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(org_router)
app.include_router(doctor_router)
app.include_router(public_router)