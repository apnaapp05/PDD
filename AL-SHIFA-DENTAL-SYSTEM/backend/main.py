# backend/main.py

from fastapi import FastAPI, Depends, HTTPException, status, Request, APIRouter, BackgroundTasks, Query, UploadFile, File, Body
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

# Local Imports
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
    logger.warning(f"Email service failed: {e}")
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
    os.makedirs("media", exist_ok=True)
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
        results.append({
            "id": d.id,
            "full_name": d.user.full_name if d.user else "Unknown",
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
    
    try: start_dt = datetime.strptime(f"{appt.date} {appt.time}", "%Y-%m-%d %I:%M %p")
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
    db.add(new_appt)
    db.flush()

    # --- INVOICE CREATION ---
    doc = db.query(models.Doctor).filter(models.Doctor.id == appt.doctor_id).first()
    if doc:
        treatment = db.query(models.Treatment).filter(
            models.Treatment.hospital_id == doc.hospital_id,
            models.Treatment.name == appt.reason
        ).first()
        amount = treatment.cost if treatment else 500.0 
        
        db.add(models.Invoice(
            appointment_id=new_appt.id,
            patient_id=patient.id,
            amount=amount,
            status="pending"
        ))

    db.commit()
    db.refresh(new_appt)
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

# ================= ORGANIZATION ROUTES =================

@org_router.get("/stats")
def org_stats(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    h = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
    if not h: return {"total_doctors": 0, "total_patients": 0, "total_revenue": 0, "utilization_rate": 0, "recent_activity": []}
    dids = [d.id for d in h.doctors]
    rev = db.query(func.sum(models.Invoice.amount)).join(models.Appointment).filter(models.Appointment.doctor_id.in_(dids), models.Invoice.status == "paid").scalar() or 0
    total_pats = db.query(models.Appointment.patient_id).filter(models.Appointment.doctor_id.in_(dids)).distinct().count()
    recent = db.query(models.Appointment).filter(models.Appointment.doctor_id.in_(dids)).order_by(models.Appointment.start_time.desc()).limit(5).all()
    activity_list = [{"id": a.id, "description": f"Appointment: {a.patient.user.full_name if a.patient and a.patient.user else 'Unknown'} with Dr. {a.doctor.user.full_name}", "date": a.start_time.strftime("%Y-%m-%d"), "status": a.status} for a in recent]
    return {"total_doctors": len(h.doctors), "total_patients": total_pats, "total_revenue": rev, "utilization_rate": 80, "recent_activity": activity_list}

@org_router.get("/doctors")
def get_org_doctors(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "organization": raise HTTPException(403, "Access denied")
    h = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
    if not h: return []
    return [{"id": d.id, "full_name": d.user.full_name, "specialization": d.specialization, "license": d.license_number, "status": "Verified" if d.is_verified else "Pending"} for d in h.doctors]

@org_router.post("/doctors/{id}/verify")
def verify_org_doctor(id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "organization": raise HTTPException(403)
    h = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
    doc = db.query(models.Doctor).filter(models.Doctor.id == id, models.Doctor.hospital_id == h.id).first()
    if not doc: raise HTTPException(404, "Doctor not found")
    doc.is_verified = True; db.commit(); return {"message": "Doctor verified"}

@org_router.delete("/doctors/{id}")
def remove_org_doctor(id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "organization": raise HTTPException(403)
    h = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
    doc = db.query(models.Doctor).filter(models.Doctor.id == id, models.Doctor.hospital_id == h.id).first()
    if not doc: raise HTTPException(404, "Doctor not found")
    user_to_del = db.query(models.User).filter(models.User.id == doc.user_id).first()
    db.query(models.Appointment).filter(models.Appointment.doctor_id == doc.id).delete()
    db.delete(doc)
    if user_to_del: db.delete(user_to_del)
    db.commit(); return {"message": "Doctor removed"}

# ================= DOCTOR ROUTES (UPDATED) =================

@doctor_router.get("/dashboard")
def get_doctor_dashboard(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    if not doc: return {"account_status": "no_profile"}
    
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # 1. Appointments Today
    appts = db.query(models.Appointment).filter(
        models.Appointment.doctor_id == doc.id, 
        models.Appointment.start_time >= today_start
    ).all()
    
    # 2. Revenue (Paid)
    revenue = db.query(func.sum(models.Invoice.amount)).join(models.Appointment).filter(
        models.Appointment.doctor_id == doc.id, 
        models.Invoice.status == "paid"
    ).scalar() or 0

    # 3. Total Patients
    total_patients = db.query(models.Appointment.patient_id).filter(models.Appointment.doctor_id == doc.id).distinct().count()

    # --- ANALYSIS LOGIC ---
    # Queue
    queue_msg = f"{len(appts)} appointments scheduled for today."
    
    # Inventory
    low_stock_count = db.query(models.InventoryItem).filter(
        models.InventoryItem.hospital_id == doc.hospital_id, 
        models.InventoryItem.quantity < models.InventoryItem.threshold
    ).count()
    inv_msg = f"{low_stock_count} items below threshold." if low_stock_count > 0 else "Stock levels are healthy."
    
    # Finance Projection (Pending)
    pending = db.query(func.sum(models.Invoice.amount)).join(models.Appointment).filter(
        models.Appointment.doctor_id == doc.id, 
        models.Invoice.status == "pending"
    ).scalar() or 0
    fin_msg = f"Rs. {pending:,.0f} pending collection."

    # Appointment List formatting
    appt_list = []
    for a in appts:
        p = db.query(models.Patient).filter(models.Patient.id == a.patient_id).first()
        p_name = p.user.full_name if p and p.user else "Blocked/Unknown"
        appt_list.append({
            "id": a.id, 
            "patient_name": p_name, 
            "treatment": a.treatment_type, 
            "time": a.start_time.strftime("%I:%M %p"), 
            "status": a.status
        })

    return {
        "account_status": "active", 
        "doctor_name": user.full_name, 
        "today_count": len(appts), 
        "total_patients": total_patients, 
        "revenue": revenue, 
        "appointments": appt_list, 
        "analysis": {
            "queue": queue_msg,
            "inventory": inv_msg,
            "revenue": fin_msg
        }
    }

@doctor_router.get("/appointments")
def get_doctor_appointments(date: str = Query(None), view: str = Query("day"), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    query = db.query(models.Appointment).filter(models.Appointment.doctor_id == doc.id)
    if date:
        try:
            target_date = datetime.strptime(date, "%Y-%m-%d")
            query = query.filter(models.Appointment.start_time >= target_date, models.Appointment.start_time < target_date + timedelta(days=1))
        except: pass
    appts = query.order_by(models.Appointment.start_time).all()
    return {"date": date, "appointments": [{"id": a.id, "patient_name": a.patient.user.full_name if a.patient else "Blocked Slot", "start": a.start_time.isoformat(), "end": a.end_time.isoformat(), "status": a.status, "type": a.treatment_type} for a in appts]}

@doctor_router.get("/schedule")
def get_schedule_legacy(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    return db.query(models.Appointment).filter(models.Appointment.doctor_id == doc.id).order_by(models.Appointment.start_time).all()

@doctor_router.get("/schedule/settings")
def get_schedule_settings(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    try: return json.loads(doc.scheduling_config)
    except: return {"work_start_time": "09:00", "work_end_time": "17:00", "slot_duration": 30, "break_duration": 0}

@doctor_router.put("/schedule/settings")
def update_schedule_settings(settings: dict = Body(...), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    doc.scheduling_config = json.dumps(settings)
    db.commit()
    return {"message": "Settings updated"}

@doctor_router.post("/schedule/block")
def block_slot(data: schemas.BlockSlotCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    try:
        date_obj = datetime.strptime(data.date, "%Y-%m-%d")
        if data.is_whole_day:
            start_dt = date_obj.replace(hour=0, minute=0, second=0)
            end_dt = date_obj.replace(hour=23, minute=59, second=59)
        else:
            if not data.time: raise HTTPException(400, "Time required")
            time_obj = datetime.strptime(data.time, "%H:%M").time()
            start_dt = datetime.combine(date_obj, time_obj)
            end_dt = start_dt + timedelta(minutes=30)
        existing = db.query(models.Appointment).filter(models.Appointment.doctor_id == doc.id, models.Appointment.status.in_(["confirmed", "blocked", "in_progress"]), models.Appointment.start_time < end_dt, models.Appointment.end_time > start_dt).first()
        if existing: raise HTTPException(400, "Slot overlaps")
        block = models.Appointment(doctor_id=doc.id, patient_id=None, start_time=start_dt, end_time=end_dt, status="blocked", treatment_type=f"Blocked: {data.reason}", notes=data.reason)
        db.add(block); db.commit()
        return {"message": "Blocked"}
    except ValueError: raise HTTPException(400, "Invalid Format")

@doctor_router.post("/appointments/{id}/start")
def start_appointment(id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    appt = db.query(models.Appointment).filter(models.Appointment.id == id, models.Appointment.doctor_id == doc.id).first()
    if not appt: raise HTTPException(404)
    if appt.status != "confirmed": return {"message": "Invalid status"}
    appt.status = "in_progress"; db.commit()
    return {"message": "Started"}

@doctor_router.post("/appointments/{id}/complete")
def complete_appointment(id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    appt = db.query(models.Appointment).filter(models.Appointment.id == id, models.Appointment.doctor_id == doc.id).first()
    if not appt: raise HTTPException(404)
    if appt.status == "completed": return {"message": "Already completed"}
    
    inv = db.query(models.Invoice).filter(models.Invoice.appointment_id == appt.id).first()
    if inv: inv.status = "paid"
    else:
        t = db.query(models.Treatment).filter(models.Treatment.name == appt.treatment_type, models.Treatment.hospital_id == doc.hospital_id).first()
        amt = t.cost if t else 500.0
        if appt.patient_id: db.add(models.Invoice(appointment_id=appt.id, patient_id=appt.patient_id, amount=amt, status="paid"))

    t = db.query(models.Treatment).filter(models.Treatment.name == appt.treatment_type, models.Treatment.hospital_id == doc.hospital_id).first()
    if t:
        for link in t.required_items: link.item.quantity = max(0, link.item.quantity - link.quantity_required)

    appt.status = "completed"; db.commit()
    return {"message": "Completed"}

@doctor_router.get("/finance")
def get_fin(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    invs = db.query(models.Invoice).join(models.Appointment).filter(models.Appointment.doctor_id == doc.id).all()
    invoice_list = [{"id": i.id, "patient_name": i.patient.user.full_name if i.patient else "Unknown", "procedure": i.appointment.treatment_type, "amount": i.amount, "status": i.status.capitalize(), "date": i.created_at.strftime("%Y-%m-%d")} for i in invs]
    return {"total_revenue": sum(i.amount for i in invs if i.status == "paid"), "total_pending": sum(i.amount for i in invs if i.status == "pending"), "invoices": invoice_list}

@doctor_router.get("/inventory")
def get_inv(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    return db.query(models.InventoryItem).filter(models.InventoryItem.hospital_id == doc.hospital_id).all()

@doctor_router.post("/inventory")
def add_inv(item: schemas.InventoryItemCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    db.add(models.InventoryItem(hospital_id=doc.hospital_id, name=item.name, quantity=item.quantity, unit=item.unit, threshold=item.threshold))
    db.commit(); return {"message": "Added"}

@doctor_router.put("/inventory/{item_id}")
def update_inventory_item(item_id: int, data: schemas.InventoryUpdate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403)
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id, models.InventoryItem.hospital_id == doctor.hospital_id).first()
    item.quantity = data.quantity; db.commit(); return {"message": "Updated"}

@doctor_router.post("/inventory/upload")
def upload_inventory(file: UploadFile = File(...), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    try:
        csvReader = csv.DictReader(codecs.iterdecode(file.file, 'utf-8')); c = 0
        for r in csvReader:
            d = {k.lower().strip(): v.strip() for k, v in r.items() if k}
            if 'item name' in d and 'quantity' in d:
                db.add(models.InventoryItem(hospital_id=doc.hospital_id, name=d['item name'], quantity=int(d['quantity']), unit=d.get('unit','pcs')))
                c+=1
        db.commit(); return {"message": f"Uploaded {c}"}
    except: raise HTTPException(400, "Bad CSV")

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

@doctor_router.post("/treatments/upload")
def upload_treatments(file: UploadFile = File(...), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    try:
        csvReader = csv.DictReader(codecs.iterdecode(file.file, 'utf-8')); c = 0
        for r in csvReader:
            d = {k.lower().strip(): v.strip() for k, v in r.items() if k}
            if 'treatment name' in d and 'cost' in d:
                db.add(models.Treatment(hospital_id=doc.hospital_id, name=d['treatment name'], cost=float(d['cost']), description=d.get('description','')))
                c+=1
        db.commit(); return {"message": f"Uploaded {c}"}
    except: raise HTTPException(400, "Bad CSV")

@doctor_router.post("/treatments/{tid}/link-inventory")
def link_inv(tid: int, data: schemas.TreatmentLinkCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    link = db.query(models.TreatmentInventoryLink).filter(models.TreatmentInventoryLink.treatment_id == tid, models.TreatmentInventoryLink.item_id == data.item_id).first()
    if link: link.quantity_required = data.quantity
    else: db.add(models.TreatmentInventoryLink(treatment_id=tid, item_id=data.item_id, quantity_required=data.quantity))
    db.commit(); return {"message": "Linked"}

# --- Patient Files ---
@doctor_router.get("/patients")
def get_doc_patients(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    appts = db.query(models.Appointment).filter(models.Appointment.doctor_id == doc.id).all()
    return [{"id": p.id, "name": p.user.full_name, "age": p.age, "gender": p.gender} for p in set(db.query(models.Patient).filter(models.Patient.id == a.patient_id).first() for a in appts if a.patient_id)]

@doctor_router.get("/patients/{id}")
def get_patient_details(id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.id == id).first()
    if not p: raise HTTPException(404)
    recs = db.query(models.MedicalRecord).filter(models.MedicalRecord.patient_id == id).all()
    files = db.query(models.PatientFile).filter(models.PatientFile.patient_id == p.id).all()
    return {"id": p.id, "full_name": p.user.full_name, "age": p.age, "gender": p.gender, "history": [{"date": str(r.date), "diagnosis": r.diagnosis, "prescription": r.prescription} for r in recs], "files": [{"id": f.id, "filename": f.filename, "path": f.filepath} for f in files]}

@doctor_router.post("/patients/{id}/files")
def upload_patient_file(id: int, file: UploadFile = File(...), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.id == id).first()
    if not p: raise HTTPException(404)
    loc = f"media/{id}_{file.filename}"
    with open(loc, "wb") as b: shutil.copyfileobj(file.file, b)
    db.add(models.PatientFile(patient_id=id, filename=file.filename, filepath=loc)); db.commit(); return {"message": "Uploaded"}

@doctor_router.post("/patients/{id}/records")
def add_rec(id: int, data: schemas.RecordCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    db.add(models.MedicalRecord(patient_id=id, doctor_id=doc.id, diagnosis=data.diagnosis, prescription=data.prescription, notes=data.notes)); db.commit(); return {"message": "Saved"}

# ================= AUTH & ADMIN (UNCHANGED) =================
@auth_router.post("/login")
def login(f: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.email == f.username.lower().strip()).first()
    if not u or not verify_password(f.password, u.password_hash): raise HTTPException(403)
    return {"access_token": create_access_token({"sub": str(u.id), "role": u.role}), "token_type": "bearer", "role": u.role}

@auth_router.post("/register")
def reg(u: schemas.UserCreate, bg: BackgroundTasks, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == u.email.lower()).first(): raise HTTPException(400, "Exists")
    nw = models.User(email=u.email.lower(), password_hash=get_password_hash(u.password), full_name=u.full_name, role=u.role, otp_code=generate_otp(), is_email_verified=False)
    db.add(nw); db.flush()
    if u.role == "organization": db.add(models.Hospital(owner_id=nw.id, name=u.full_name, address=u.address))
    elif u.role == "patient": db.add(models.Patient(user_id=nw.id, age=u.age, gender=u.gender))
    elif u.role == "doctor":
        h = db.query(models.Hospital).filter(models.Hospital.name == u.hospital_name).first()
        if h: db.add(models.Doctor(user_id=nw.id, hospital_id=h.id, specialization=u.specialization, license_number=u.license_number))
    db.commit()
    bg.add_task(lambda e, o: email_service.send(e, "OTP", o) if email_service else print(f"OTP: {o}"), u.email, nw.otp_code)
    return {"message": "OTP sent"}

@auth_router.post("/verify-otp")
def v_otp(d: schemas.VerifyOTP, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.email == d.email.lower()).first()
    if not u or u.otp_code != d.otp: raise HTTPException(400, "Invalid OTP")
    u.is_email_verified = True; db.commit()
    return {"message": "Verified", "role": u.role}

@auth_router.get("/me")
def me(u: models.User = Depends(get_current_user)): return u

@auth_router.get("/hospitals")
def get_hosps(db: Session = Depends(get_db)): return [{"id": h.id, "name": h.name, "address": h.address} for h in db.query(models.Hospital).filter(models.Hospital.is_verified==True).all()]

@admin_router.get("/doctors")
def get_ad_docs(db: Session = Depends(get_db)): return [{"id": d.id, "name": d.user.full_name, "is_verified": d.is_verified} for d in db.query(models.Doctor).all()]

@admin_router.get("/organizations")
def get_ad_orgs(db: Session = Depends(get_db)): return [{"id": h.id, "name": h.name, "is_verified": h.is_verified} for h in db.query(models.Hospital).all()]

@admin_router.get("/patients")
def get_ad_patients(db: Session = Depends(get_db)):
    patients = db.query(models.Patient).all()
    return [{"id": p.id, "name": p.user.full_name if p.user else "Unknown", "email": p.user.email if p.user else "N/A", "age": p.age, "gender": p.gender, "created_at": p.user.created_at.strftime("%Y-%m-%d") if p.user and p.user.created_at else "N/A"} for p in patients]

@admin_router.post("/approve-account/{id}")
def approve(id: int, type: str, db: Session = Depends(get_db)):
    if type == "doctor": d = db.query(models.Doctor).filter(models.Doctor.id == id).first(); d.is_verified = True
    elif type == "organization": h = db.query(models.Hospital).filter(models.Hospital.id == id).first(); h.is_verified = True
    db.commit(); return {"message": "Approved"}

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth_router); app.include_router(admin_router); app.include_router(org_router); app.include_router(doctor_router); app.include_router(public_router)
app.mount("/media", StaticFiles(directory="media"), name="media")