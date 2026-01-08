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
import shutil
import json
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

try:
    email_service = EmailAdapter()
except Exception as e:
    logger.warning(f"Email service failed to initialize: {e}")
    email_service = None

# --- DATABASE & STARTUP ---
def init_db():
    models.Base.metadata.create_all(bind=database.engine)

def create_default_admin(db: Session):
    admin_email = "admin@system"
    if not db.query(models.User).filter(models.User.email == admin_email).first():
        pwd_hash = bcrypt.hashpw("admin123".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        db.add(models.User(email=admin_email, full_name="System Admin", role="admin", is_email_verified=True, password_hash=pwd_hash))
        db.commit()

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    db = database.SessionLocal()
    try: create_default_admin(db)
    finally: db.close()
    yield

# --- UTILS ---
def get_db():
    db = database.SessionLocal()
    try: yield db
    finally: db.close()

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

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

@public_router.get("/doctors/{doctor_id}/treatments")
def get_doctor_treatments_public(doctor_id: int, db: Session = Depends(get_db)):
    doctor = db.query(models.Doctor).filter(models.Doctor.id == doctor_id).first()
    if not doctor or not doctor.hospital_id: return []
    treatments = db.query(models.Treatment).filter(models.Treatment.hospital_id == doctor.hospital_id).all()
    return [{"name": t.name, "cost": t.cost, "description": t.description} for t in treatments]

@public_router.post("/appointments")
def create_appointment(appt: schemas.AppointmentCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "patient": raise HTTPException(403, "Only patients can book")
    patient = db.query(models.Patient).filter(models.Patient.user_id == user.id).first()
    if not patient: raise HTTPException(400, "Patient profile not found")
    
    try:
        start_dt = datetime.strptime(f"{appt.date} {appt.time}", "%Y-%m-%d %I:%M %p")
    except:
        try: start_dt = datetime.strptime(f"{appt.date} {appt.time}", "%Y-%m-%d %H:%M")
        except: raise HTTPException(400, "Invalid date/time format")
    
    if start_dt < datetime.now(): raise HTTPException(400, "Cannot book past time")
    end_dt = start_dt + timedelta(minutes=30)

    existing = db.query(models.Appointment).filter(
        models.Appointment.doctor_id == appt.doctor_id,
        models.Appointment.status.in_(["confirmed", "blocked", "in_progress"]),
        models.Appointment.start_time < end_dt,
        models.Appointment.end_time > start_dt
    ).first()
    if existing: raise HTTPException(400, "Slot unavailable")

    new_appt = models.Appointment(
        doctor_id=appt.doctor_id,
        patient_id=patient.id,
        start_time=start_dt,
        end_time=end_dt,
        status="confirmed",
        treatment_type=appt.reason,
        notes="Booked via Portal"
    )
    db.add(new_appt); db.flush()

    doc = db.query(models.Doctor).filter(models.Doctor.id == appt.doctor_id).first()
    if doc:
        treatment = db.query(models.Treatment).filter(models.Treatment.hospital_id == doc.hospital_id, models.Treatment.name == appt.reason).first()
        amount = treatment.cost if treatment else 0
        db.add(models.Invoice(appointment_id=new_appt.id, patient_id=patient.id, amount=amount, status="pending"))

    db.commit(); db.refresh(new_appt)
    return {"message": "Booked", "id": new_appt.id}

@public_router.get("/patient/appointments")
def get_my_appointments(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.user_id == user.id).first()
    if not p: return []
    appts = db.query(models.Appointment).filter(models.Appointment.patient_id == p.id).order_by(models.Appointment.start_time.desc()).all()
    res = []
    for a in appts:
        d = db.query(models.Doctor).filter(models.Doctor.id == a.doctor_id).first()
        res.append({
            "id": a.id, "treatment": a.treatment_type, "doctor": d.user.full_name if d else "Unknown",
            "date": a.start_time.strftime("%Y-%m-%d"), "time": a.start_time.strftime("%I:%M %p"),
            "status": a.status, "hospital_name": d.hospital.name if d and d.hospital else ""
        })
    return res

@public_router.put("/patient/appointments/{appt_id}/cancel")
def cancel_patient_appointment(appt_id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.user_id == user.id).first()
    if not p: raise HTTPException(404, "Patient not found")
    appt = db.query(models.Appointment).filter(models.Appointment.id == appt_id, models.Appointment.patient_id == p.id).first()
    if not appt: raise HTTPException(404, "Appointment not found")
    
    appt.status = "cancelled"
    inv = db.query(models.Invoice).filter(models.Invoice.appointment_id == appt.id, models.Invoice.status == "pending").first()
    if inv: db.delete(inv)
    db.commit()
    return {"message": "Cancelled"}

@public_router.get("/patient/invoices")
def get_my_invoices(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.user_id == user.id).first()
    if not p: return []
    invoices = db.query(models.Invoice).filter(models.Invoice.patient_id == p.id).order_by(models.Invoice.created_at.desc()).all()
    res = []
    for i in invoices:
        appt = i.appointment
        doc = appt.doctor if appt else None
        res.append({
            "id": i.id, "amount": i.amount, "status": i.status, "date": i.created_at.strftime("%Y-%m-%d"),
            "treatment": appt.treatment_type if appt else "N/A",
            "doctor_name": doc.user.full_name if doc and doc.user else "Unknown"
        })
    return res

@public_router.get("/patient/invoices/{id}")
def get_patient_invoice_detail(id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.user_id == user.id).first()
    inv = db.query(models.Invoice).filter(models.Invoice.id == id, models.Invoice.patient_id == p.id).first()
    if not inv: raise HTTPException(404)
    appt = inv.appointment
    return {
        "id": inv.id, "date": str(inv.created_at), "amount": inv.amount, "status": inv.status,
        "hospital": {"name": appt.doctor.hospital.name, "address": appt.doctor.hospital.address, "phone": appt.doctor.hospital.owner.phone_number or ""},
        "doctor": {"name": appt.doctor.user.full_name},
        "patient": {"name": user.full_name, "id": p.id},
        "treatment": {"name": appt.treatment_type}
    }

@public_router.get("/patient/records")
def get_my_records(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.user_id == user.id).first()
    if not p: return []
    recs = db.query(models.MedicalRecord).filter(models.MedicalRecord.patient_id == p.id).order_by(models.MedicalRecord.date.desc()).all()
    return [{"id": r.id, "diagnosis": r.diagnosis, "prescription": r.prescription, "date": r.date.strftime("%Y-%m-%d"), "doctor_name": r.doctor.user.full_name} for r in recs]

# ================= DOCTOR ROUTES =================

@doctor_router.put("/inventory/{item_id}")
def update_inventory_item(item_id: int, data: schemas.InventoryUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403)
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id, models.InventoryItem.hospital_id == doctor.hospital_id).first()
    if not item: raise HTTPException(404)
    item.quantity = data.quantity; item.last_updated = datetime.utcnow()
    db.commit()
    return {"message": "Updated", "new_quantity": item.quantity}

@doctor_router.get("/dashboard")
def get_doctor_dashboard(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    if not doc: return {"account_status": "no_profile"}
    
    now = datetime.now()
    appts = db.query(models.Appointment).filter(
        models.Appointment.doctor_id == doc.id,
        models.Appointment.start_time >= now.replace(hour=0, minute=0, second=0),
        models.Appointment.start_time < now.replace(hour=0, minute=0, second=0) + timedelta(days=1)
    ).order_by(models.Appointment.start_time).all()
    
    revenue = db.query(func.sum(models.Invoice.amount)).join(models.Appointment).filter(models.Appointment.doctor_id == doc.id, models.Invoice.status == "paid").scalar() or 0
    total_patients = db.query(models.Appointment.patient_id).filter(models.Appointment.doctor_id == doc.id).distinct().count()
    
    analysis = {}
    analysis["queue"] = f"{len(appts)} patients today."
    low_stock = db.query(models.InventoryItem).filter(models.InventoryItem.hospital_id == doc.hospital_id, models.InventoryItem.quantity < models.InventoryItem.threshold).count()
    analysis["inventory"] = f"{low_stock} items low." if low_stock else "Inventory OK."
    analysis["revenue"] = f"Rev: Rs. {revenue}"

    appt_list = []
    for a in appts:
        p = db.query(models.Patient).filter(models.Patient.id == a.patient_id).first()
        appt_list.append({
            "id": a.id, "patient_name": p.user.full_name if p else "Unknown", 
            "treatment": a.treatment_type, "time": a.start_time.strftime("%I:%M %p"), "status": a.status
        })

    return {
        "account_status": "active", "doctor_name": user.full_name,
        "today_count": len(appts), "total_patients": total_patients, "revenue": revenue,
        "appointments": appt_list, "analysis": analysis
    }

@doctor_router.post("/appointments/{id}/start")
def start_appointment(id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    appt = db.query(models.Appointment).filter(models.Appointment.id == id, models.Appointment.doctor_id == doc.id).first()
    if not appt: raise HTTPException(404)
    appt.status = "in_progress"; db.commit()
    return {"message": "Started", "status": "in_progress"}

@doctor_router.post("/appointments/{id}/complete")
def complete_appointment(id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    appt = db.query(models.Appointment).filter(models.Appointment.id == id, models.Appointment.doctor_id == doc.id).first()
    if not appt: raise HTTPException(404)
    if appt.status == "completed": return {"message": "Already completed"}
    
    # 1. Update Invoice to Paid
    inv = db.query(models.Invoice).filter(models.Invoice.appointment_id == appt.id).first()
    if inv: inv.status = "paid"
    else:
        t = db.query(models.Treatment).filter(models.Treatment.name == appt.treatment_type, models.Treatment.hospital_id == doc.hospital_id).first()
        db.add(models.Invoice(appointment_id=appt.id, patient_id=appt.patient_id, amount=t.cost if t else 0, status="paid"))

    # 2. Deduct Inventory
    t = db.query(models.Treatment).filter(models.Treatment.name == appt.treatment_type, models.Treatment.hospital_id == doc.hospital_id).first()
    if t:
        for l in t.required_items: l.item.quantity = max(0, l.item.quantity - l.quantity_required)

    appt.status = "completed"; db.commit()
    return {"message": "Completed", "status": "completed"}

@doctor_router.post("/inventory/upload")
def upload_inventory(file: UploadFile = File(...), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403)
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    try:
        csvReader = csv.DictReader(codecs.iterdecode(file.file, 'utf-8'))
        count = 0
        for row in csvReader:
            data = {k.lower().strip(): v.strip() for k, v in row.items() if k}
            name = data.get('item name') or data.get('name'); qty_str = data.get('quantity') or data.get('qty'); unit = data.get('unit') or 'pcs'
            if not name or not qty_str: continue
            try: qty = int(qty_str)
            except: continue
            existing = db.query(models.InventoryItem).filter(models.InventoryItem.hospital_id == doctor.hospital_id, models.InventoryItem.name == name).first()
            if existing: existing.quantity += qty
            else: db.add(models.InventoryItem(hospital_id=doctor.hospital_id, name=name, quantity=qty, unit=unit, threshold=10))
            count += 1
        db.commit(); return {"message": f"Uploaded {count} items"}
    except Exception as e: db.rollback(); raise HTTPException(400, f"Error: {str(e)}")

@doctor_router.post("/treatments/upload")
def upload_treatments(file: UploadFile = File(...), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403)
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    try:
        csvReader = csv.DictReader(codecs.iterdecode(file.file, 'utf-8'))
        count = 0
        for row in csvReader:
            data = {k.lower().strip(): v.strip() for k, v in row.items() if k}
            name = data.get('treatment name') or data.get('name'); cost_str = data.get('cost') or data.get('price'); desc = data.get('description') or ""
            if not name or not cost_str: continue
            try: cost = float(cost_str)
            except: continue
            existing = db.query(models.Treatment).filter(models.Treatment.hospital_id == doctor.hospital_id, models.Treatment.name == name).first()
            if existing: existing.cost = cost
            else: db.add(models.Treatment(hospital_id=doctor.hospital_id, name=name, cost=cost, description=desc))
            count += 1
        db.commit(); return {"message": f"Uploaded {count} treatments"}
    except Exception as e: db.rollback(); raise HTTPException(400, f"Error: {str(e)}")

@doctor_router.get("/treatments")
def get_doc_treatments(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    treatments = db.query(models.Treatment).filter(models.Treatment.hospital_id == doc.hospital_id).all()
    results = []
    for t in treatments:
        recipe = [{"item_name": l.item.name, "qty_required": l.quantity_required, "unit": l.item.unit} for l in t.required_items]
        results.append({"id": t.id, "name": t.name, "cost": t.cost, "description": t.description, "recipe": recipe})
    return results

@doctor_router.post("/treatments")
def create_treatment(data: schemas.TreatmentCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    db.add(models.Treatment(hospital_id=doc.hospital_id, name=data.name, cost=data.cost, description=data.description))
    db.commit(); return {"message": "Created"}

@doctor_router.post("/treatments/{tid}/link-inventory")
def link_inv(tid: int, data: schemas.TreatmentLinkCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    link = db.query(models.TreatmentInventoryLink).filter(models.TreatmentInventoryLink.treatment_id == tid, models.TreatmentInventoryLink.item_id == data.item_id).first()
    if link: link.quantity_required = data.quantity
    else: db.add(models.TreatmentInventoryLink(treatment_id=tid, item_id=data.item_id, quantity_required=data.quantity))
    db.commit(); return {"message": "Linked"}

@doctor_router.get("/inventory")
def get_inv(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    return db.query(models.InventoryItem).filter(models.InventoryItem.hospital_id == doc.hospital_id).all()

@doctor_router.post("/inventory")
def add_inv(item: schemas.InventoryItemCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    db.add(models.InventoryItem(hospital_id=doc.hospital_id, name=item.name, quantity=item.quantity, unit=item.unit, threshold=item.threshold))
    db.commit(); return {"message": "Added"}

@doctor_router.get("/schedule")
def get_sched(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    return db.query(models.Appointment).filter(models.Appointment.doctor_id == doc.id).all()

@doctor_router.get("/schedule/settings")
def get_schedule_settings(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403)
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    if not doc: raise HTTPException(404, "Doctor profile not found")
    
    if not doc.scheduling_config:
         return {"work_start_time": "09:00", "work_end_time": "17:00", "slot_duration": 30, "break_duration": 0}
    try:
        return json.loads(doc.scheduling_config)
    except:
         return {"work_start_time": "09:00", "work_end_time": "17:00", "slot_duration": 30, "break_duration": 0}

@doctor_router.put("/schedule/settings")
def update_schedule_settings(settings: dict, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403)
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    if not doc: raise HTTPException(404, "Doctor profile not found")
    
    doc.scheduling_config = json.dumps(settings)
    db.commit()
    return {"message": "Settings updated"}

@doctor_router.get("/finance")
def get_fin(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    invs = db.query(models.Invoice).join(models.Appointment).filter(models.Appointment.doctor_id == doc.id).all()
    return {"total_revenue": sum(i.amount for i in invs if i.status=="paid"), "total_pending": sum(i.amount for i in invs if i.status=="pending"), "invoices": []}

@doctor_router.get("/patients")
def get_doc_patients(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    appts = db.query(models.Appointment).filter(models.Appointment.doctor_id == doc.id).all()
    pids = set(a.patient_id for a in appts)
    res = []
    for pid in pids:
        p = db.query(models.Patient).filter(models.Patient.id == pid).first()
        res.append({"id": p.id, "name": p.user.full_name, "age": p.age, "gender": p.gender})
    return res

@doctor_router.get("/patients/{id}")
def get_pat_det(id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.id == id).first()
    recs = db.query(models.MedicalRecord).filter(models.MedicalRecord.patient_id == id).all()
    files = db.query(models.PatientFile).filter(models.PatientFile.patient_id == id).all()
    return {"id": p.id, "full_name": p.user.full_name, "age": p.age, "gender": p.gender, 
            "history": [{"date": r.date.strftime("%Y-%m-%d"), "diagnosis": r.diagnosis, "prescription": r.prescription, "doctor_name": r.doctor.user.full_name} for r in recs],
            "files": [{"id": f.id, "filename": f.filename, "path": f.filepath, "date": f.uploaded_at.strftime("%Y-%m-%d")} for f in files]}

@doctor_router.post("/patients/{patient_id}/files")
def upload_patient_file(patient_id: int, file: UploadFile = File(...), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient: raise HTTPException(404, "Patient not found")
    os.makedirs("media", exist_ok=True)
    file_location = f"media/{patient_id}_{file.filename}"
    with open(file_location, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
    db.add(models.PatientFile(patient_id=patient_id, filename=file.filename, filepath=file_location))
    db.commit()
    return {"message": "File uploaded successfully"}

@doctor_router.post("/patients/{id}/records")
def add_rec(id: int, data: schemas.RecordCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    db.add(models.MedicalRecord(patient_id=id, doctor_id=doc.id, diagnosis=data.diagnosis, prescription=data.prescription, notes=data.notes, date=datetime.utcnow()))
    db.commit(); return {"message": "Saved"}

# ================= AUTH ROUTES =================
@auth_router.post("/login")
def login(f: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.email == f.username.lower().strip()).first()
    if not u or not verify_password(f.password, u.password_hash): raise HTTPException(403, "Invalid Credentials")
    if not u.is_email_verified: raise HTTPException(403, "Email not verified")
    
    # ------------------ ADDED APPROVAL CHECKS ------------------
    if u.role == "doctor":
        d = db.query(models.Doctor).filter(models.Doctor.user_id == u.id).first()
        if d and not d.is_verified: raise HTTPException(403, "Account pending Admin approval")
    elif u.role == "organization":
        h = db.query(models.Hospital).filter(models.Hospital.owner_id == u.id).first()
        if h and not h.is_verified: raise HTTPException(403, "Account pending Admin approval")
    # -----------------------------------------------------------

    return {"access_token": create_access_token({"sub": str(u.id), "role": u.role}), "token_type": "bearer", "role": u.role}

@auth_router.post("/register")
def register(user: schemas.UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email_clean = user.email.lower().strip()
    # Check if verified exists
    if db.query(models.User).filter(models.User.email == email_clean, models.User.is_email_verified == True).first(): 
        raise HTTPException(400, "Email already registered")
    
    # Check unverified
    existing_unverified = db.query(models.User).filter(models.User.email == email_clean, models.User.is_email_verified == False).first()
    
    otp = generate_otp()
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Helper for email
    def send_email_safe(email, otp_code):
        if email_service:
            try: email_service.send(email, "Verification", f"OTP: {otp_code}")
            except Exception as e: logger.error(f"Failed to send email to {email}: {e}")
        else:
            logger.info(f"EMAIL SERVICE NOT CONFIGURED. OTP for {email}: {otp_code}")

    try:
        if existing_unverified:
            existing_unverified.otp_code = otp
            existing_unverified.otp_expires_at = expires_at
            existing_unverified.password_hash = get_password_hash(user.password)
            existing_unverified.full_name = user.full_name
            db.commit()
        else:
            hashed_pw = get_password_hash(user.password)
            new_user = models.User(email=email_clean, password_hash=hashed_pw, full_name=user.full_name, role=user.role, is_email_verified=False, otp_code=otp, otp_expires_at=expires_at)
            db.add(new_user); db.flush() 
            if user.role == "organization": db.add(models.Hospital(owner_id=new_user.id, name=user.full_name, address=user.address or "Pending", is_verified=False))
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
    
    if user.is_email_verified: return {"message": "Already verified", "status": "active", "role": user.role}
    if user.otp_expires_at and datetime.utcnow() > user.otp_expires_at: raise HTTPException(400, "OTP has expired")
    if str(user.otp_code).strip() != str(data.otp.strip()): raise HTTPException(400, "Invalid OTP")
        
    user.is_email_verified = True
    user.otp_code = None
    db.commit()
    return {"message": "Verified", "status": "active", "role": user.role}

@auth_router.get("/me")
def me(u: models.User = Depends(get_current_user)): return u

@auth_router.get("/hospitals")
def get_verified_hospitals(db: Session = Depends(get_db)):
    hospitals = db.query(models.Hospital).filter(models.Hospital.is_verified == True).all()
    return [{"id": h.id, "name": h.name, "address": h.address} for h in hospitals]

# ================= ADMIN ROUTES =================
@admin_router.get("/stats")
def get_admin_stats(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(403)
    return {"doctors": db.query(models.Doctor).count(), "patients": db.query(models.Patient).count(), "organizations": db.query(models.Hospital).count(), "revenue": 0}

@admin_router.get("/doctors")
def get_all_doctors(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(403)
    doctors = db.query(models.Doctor).all()
    return [{"id": d.id, "name": d.user.full_name if d.user else "Unknown", "email": d.user.email if d.user else "", "specialization": d.specialization, "license": d.license_number, "is_verified": d.is_verified, "hospital_name": d.hospital.name if d.hospital else "N/A"} for d in doctors]

@admin_router.get("/organizations")
def get_all_organizations(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "admin": raise HTTPException(403)
    orgs = db.query(models.Hospital).all()
    return [{"id": h.id, "name": h.name, "address": h.address, "owner_email": h.owner.email if h.owner else "", "is_verified": h.is_verified, "pending_address": h.pending_address, "pending_lat": h.pending_lat, "pending_lng": h.pending_lng} for h in orgs]

@admin_router.post("/approve-account/{id}")
def approve_account(id: int, type: str, db: Session = Depends(get_db)):
    if type == "organization":
        h = db.query(models.Hospital).filter(models.Hospital.id == id).first()
        if h: 
            if h.pending_address: h.address, h.lat, h.lng, h.pending_address = h.pending_address, h.pending_lat, h.pending_lng, None
            h.is_verified = True
    elif type == "doctor":
        d = db.query(models.Doctor).filter(models.Doctor.id == id).first()
        if d: d.is_verified = True
    db.commit(); return {"message": "Approved"}

@admin_router.delete("/delete/{type}/{id}")
def delete_entity(type: str, id: int, db: Session = Depends(get_db)):
    try:
        if type == "doctor":
            r = db.query(models.Doctor).filter(models.Doctor.id == id).first()
            if r: db.delete(r.user); db.delete(r)
        elif type == "organization":
            r = db.query(models.Hospital).filter(models.Hospital.id == id).first()
            if r: db.delete(r.owner); db.delete(r)
        db.commit(); return {"message": "Deleted"}
    except: db.rollback(); raise HTTPException(500, "Delete failed")

# ================= ORGANIZATION ROUTES =================
@org_router.get("/stats")
def get_org_stats(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "organization": raise HTTPException(403)
    h = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
    if not h: return {}
    dids = [d.id for d in h.doctors]
    rev = db.query(func.sum(models.Invoice.amount)).join(models.Appointment).filter(models.Appointment.doctor_id.in_(dids), models.Invoice.status == "paid").scalar() or 0
    return {"total_doctors": len(h.doctors), "total_patients": 0, "total_revenue": rev, "utilization_rate": 80}

@org_router.get("/details")
def get_org_details(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()

@org_router.get("/doctors")
def get_org_doctors(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    h = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
    return [{"id": d.id, "full_name": d.user.full_name, "email": d.user.email, "specialization": d.specialization, "license": d.license_number, "is_verified": d.is_verified} for d in h.doctors]

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth_router); app.include_router(admin_router); app.include_router(org_router); app.include_router(doctor_router); app.include_router(public_router)
os.makedirs("media", exist_ok=True); app.mount("/media", StaticFiles(directory="media"), name="media")