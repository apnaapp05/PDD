# backend/main.py

from fastapi import FastAPI, Depends, HTTPException, status, Request, APIRouter, BackgroundTasks, Query, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
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

# ================= PUBLIC ROUTES =================
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

# --- PATIENT INVOICES (NEW) ---
@public_router.get("/patient/invoices")
def get_patient_invoices(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "patient": raise HTTPException(403, "Access denied")
    patient = db.query(models.Patient).filter(models.Patient.user_id == user.id).first()
    if not patient: return []
    
    invoices = db.query(models.Invoice).filter(models.Invoice.patient_id == patient.id).order_by(models.Invoice.created_at.desc()).all()
    results = []
    for inv in invoices:
        appt = inv.appointment
        doc = appt.doctor if appt else None
        results.append({
            "id": inv.id,
            "date": inv.created_at.strftime("%Y-%m-%d"),
            "amount": inv.amount,
            "status": inv.status,
            "treatment": appt.treatment_type if appt else "N/A",
            "doctor_name": doc.user.full_name if doc and doc.user else "Unknown"
        })
    return results

@public_router.get("/patient/invoices/{id}")
def get_patient_invoice_detail(id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "patient": raise HTTPException(403, "Access denied")
    patient = db.query(models.Patient).filter(models.Patient.user_id == user.id).first()
    invoice = db.query(models.Invoice).filter(models.Invoice.id == id, models.Invoice.patient_id == patient.id).first()
    if not invoice: raise HTTPException(404, "Invoice not found")
    
    appt = invoice.appointment
    doctor = appt.doctor
    hospital = doctor.hospital
    
    return {
        "id": invoice.id,
        "date": invoice.created_at.strftime("%Y-%m-%d"),
        "amount": invoice.amount,
        "status": invoice.status,
        "hospital": {
            "name": hospital.name,
            "address": hospital.address,
            "phone": hospital.owner.phone_number or "N/A"
        },
        "doctor": {
            "name": doctor.user.full_name,
            "specialization": doctor.specialization
        },
        "patient": {
            "name": user.full_name,
            "age": patient.age,
            "gender": patient.gender,
            "id": patient.id
        },
        "treatment": {
            "name": appt.treatment_type,
            "notes": appt.notes
        }
    }

# ================= AUTH ROUTES =================
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
        
        background_tasks.add_task(send_email_safe, email_clean, otp)
        return {"message": "OTP sent", "email": email_clean}
    except Exception as e: 
        db.rollback()
        raise HTTPException(500, f"Error: {str(e)}")

@auth_router.post("/verify-otp")
def verify_otp(data: schemas.VerifyOTP, db: Session = Depends(get_db)):
    email_clean = data.email.lower().strip()
    user = db.query(models.User).filter(models.User.email == email_clean).first()
    if not user: raise HTTPException(400, "User not found")
    if user.otp_code != data.otp: raise HTTPException(400, "Invalid OTP")
    user.is_email_verified = True
    user.otp_code = None
    db.commit()
    return {"message": "Verified", "role": user.role}

@auth_router.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    username = form_data.username.lower().strip()
    user = db.query(models.User).filter(models.User.email == username).first()
    if not user or not verify_password(form_data.password, user.password_hash): raise HTTPException(403, "Invalid Credentials")
    if not user.is_email_verified: raise HTTPException(403, "Email not verified")
    return {"access_token": create_access_token({"sub": str(user.id), "role": user.role}), "token_type": "bearer", "role": user.role}

# ================= ADMIN ROUTES =================
@admin_router.get("/stats")
def get_admin_stats(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(403)
    return {
        "doctors": db.query(models.Doctor).count(),
        "patients": db.query(models.Patient).count(),
        "organizations": db.query(models.Hospital).count(),
        "revenue": 0 
    }

@admin_router.get("/doctors")
def get_all_doctors(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(403)
    doctors = db.query(models.Doctor).all()
    return [{
        "id": d.id, 
        "name": d.user.full_name if d.user else "Unknown",
        "email": d.user.email if d.user else "", 
        "specialization": d.specialization, 
        "is_verified": d.is_verified,
        "hospital_name": d.hospital.name if d.hospital else "N/A"
    } for d in doctors]

@admin_router.get("/organizations")
def get_all_organizations(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(403)
    orgs = db.query(models.Hospital).all()
    return [{
        "id": h.id, "name": h.name, "address": h.address, "is_verified": h.is_verified,
        "pending_address": h.pending_address, "pending_lat": h.pending_lat, "pending_lng": h.pending_lng
    } for h in orgs]

@admin_router.post("/approve-account/{id}")
def approve_account(id: int, type: str = Query(...), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(403)
    if type == "organization":
        h = db.query(models.Hospital).filter(models.Hospital.id == id).first()
        if h:
            if h.pending_address:
                h.address, h.pincode, h.lat, h.lng, h.pending_address = h.pending_address, h.pending_pincode, h.pending_lat, h.pending_lng, None
            h.is_verified = True; db.commit(); return {"message": "Approved"}
    elif type == "doctor":
        d = db.query(models.Doctor).filter(models.Doctor.id == id).first()
        if d: d.is_verified = True; db.commit(); return {"message": "Approved"}
    raise HTTPException(404)

@admin_router.delete("/delete/{type}/{id}")
def delete_entity(type: str, id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(403)
    if type == "doctor":
        d = db.query(models.Doctor).filter(models.Doctor.id == id).first()
        if d: db.delete(d.user); db.delete(d)
    elif type == "organization":
        o = db.query(models.Hospital).filter(models.Hospital.id == id).first()
        if o: db.delete(o.owner); db.delete(o)
    db.commit(); return {"message": "Deleted"}

# ================= ORGANIZATION ROUTES =================
@org_router.get("/details")
def get_org_details(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()

@org_router.post("/location-change")
def request_loc_change(data: schemas.LocationUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    h = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
    h.pending_address, h.pending_pincode, h.pending_lat, h.pending_lng = data.address, data.pincode, data.lat, data.lng
    db.commit(); return {"message": "Requested"}

@org_router.get("/doctors")
def get_org_doctors(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    h = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
    return [{"id": d.id, "full_name": d.user.full_name, "is_verified": d.is_verified} for d in h.doctors]

# ================= DOCTOR ROUTES =================
@doctor_router.get("/dashboard")
def get_doctor_dashboard(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    d = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    if not d: return {"account_status": "no_profile"}
    now = datetime.now()
    appts = db.query(models.Appointment).filter(models.Appointment.doctor_id == d.id, models.Appointment.start_time >= now.replace(hour=0)).all()
    return {"account_status": "active", "doctor_name": user.full_name, "today_count": len(appts), "revenue": 0, "appointments": []}

@doctor_router.post("/appointments/{id}/complete")
def complete_appointment(id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    appt = db.query(models.Appointment).filter(models.Appointment.id == id, models.Appointment.doctor_id == doctor.id).first()
    if not appt: raise HTTPException(404)
    treatment = db.query(models.Treatment).filter(models.Treatment.name == appt.treatment_type, models.Treatment.hospital_id == doctor.hospital_id).first()
    if treatment:
        db.add(models.Invoice(appointment_id=appt.id, patient_id=appt.patient_id, amount=treatment.cost, status="pending"))
        for link in treatment.required_items: link.item.quantity -= link.quantity_required
    appt.status = "completed"; db.commit()
    return {"message": "Completed", "details": ["Invoice Generated", "Stock Deducted"]}

@doctor_router.get("/finance")
def get_doctor_finance(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    invoices = db.query(models.Invoice).join(models.Appointment).filter(models.Appointment.doctor_id == doctor.id).all()
    return {"total_revenue": sum(i.amount for i in invoices if i.status == "paid"), "total_pending": sum(i.amount for i in invoices if i.status == "pending"), "invoices": []}

@doctor_router.get("/invoices/{id}")
def get_invoice_detail(id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    inv = db.query(models.Invoice).filter(models.Invoice.id == id).first()
    return {"id": inv.id, "date": str(inv.created_at), "amount": inv.amount, "hospital": {"name": inv.appointment.doctor.hospital.name, "address": inv.appointment.doctor.hospital.address}, "patient": {"name": inv.patient.user.full_name}, "treatment": {"name": inv.appointment.treatment_type}}

@doctor_router.post("/treatments")
def create_treatment(data: schemas.TreatmentCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    new_t = models.Treatment(hospital_id=doc.hospital_id, name=data.name, cost=data.cost)
    db.add(new_t); db.commit(); return new_t

@doctor_router.get("/treatments")
def get_treatments(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    return db.query(models.Treatment).filter(models.Treatment.hospital_id == doc.hospital_id).all()

# --- OTHER DOCTOR ENDPOINTS (Inventory, Patients, Schedule) should be kept as in your 850-line version ---

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth_router); app.include_router(admin_router); app.include_router(org_router); app.include_router(doctor_router); app.include_router(public_router)
os.makedirs("media", exist_ok=True); app.mount("/media", StaticFiles(directory="media"), name="media")