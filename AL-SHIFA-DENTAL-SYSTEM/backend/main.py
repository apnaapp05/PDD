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
import shutil # Required for file operations
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
    # Ensure media directory exists for file uploads
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

# ================= PUBLIC ROUTES (Booking, Patient Access) =================

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
    
    # Date Parsing logic
    try: start_dt = datetime.strptime(f"{appt.date} {appt.time}", "%Y-%m-%d %I:%M %p")
    except:
        try: start_dt = datetime.strptime(f"{appt.date} {appt.time}", "%Y-%m-%d %H:%M")
        except: raise HTTPException(400, "Invalid date/time format")
    
    if start_dt < datetime.now(): raise HTTPException(400, "Cannot book past time")
    end_dt = start_dt + timedelta(minutes=30)

    # Check availability
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

    # Create Pending Invoice automatically
    doc = db.query(models.Doctor).filter(models.Doctor.id == appt.doctor_id).first()
    if doc:
        treatment = db.query(models.Treatment).filter(
            models.Treatment.hospital_id == doc.hospital_id,
            models.Treatment.name == appt.reason
        ).first()
        amount = treatment.cost if treatment else 0
        
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
    # Remove pending invoice
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

# ================= DOCTOR ROUTES (Consolidated) =================

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
    
    revenue = db.query(func.sum(models.Invoice.amount)).join(models.Appointment).filter(
        models.Appointment.doctor_id == doc.id, 
        models.Invoice.status == "paid"
    ).scalar() or 0
    
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
            "treatment": a.treatment_type,
            "time": a.start_time.strftime("%I:%M %p"), 
            "status": a.status
        })

    return {
        "account_status": "active", "doctor_name": user.full_name,
        "today_count": len(appts), "total_patients": total_patients, "revenue": revenue,
        "appointments": appt_list,
        "analysis": analysis
    }

# --- Inventory Management ---

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
    """Update stock quantity directly (used for +/- buttons)."""
    if user.role != "doctor": raise HTTPException(403)
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id, models.InventoryItem.hospital_id == doctor.hospital_id).first()
    if not item: raise HTTPException(404, "Item not found")
    
    item.quantity = data.quantity
    item.last_updated = datetime.utcnow()
    db.commit()
    return {"message": "Stock updated", "new_quantity": item.quantity}

@doctor_router.post("/inventory/upload")
def upload_inventory(file: UploadFile = File(...), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403)
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    try:
        csvReader = csv.DictReader(codecs.iterdecode(file.file, 'utf-8'))
        count = 0
        for row in csvReader:
            data = {k.lower().strip(): v.strip() for k, v in row.items() if k}
            name = data.get('item name') or data.get('name')
            qty_str = data.get('quantity') or data.get('qty')
            unit = data.get('unit') or 'pcs'
            if not name or not qty_str: continue
            try: qty = int(qty_str)
            except: continue
            existing = db.query(models.InventoryItem).filter(models.InventoryItem.hospital_id == doctor.hospital_id, models.InventoryItem.name == name).first()
            if existing: existing.quantity += qty
            else: db.add(models.InventoryItem(hospital_id=doctor.hospital_id, name=name, quantity=qty, unit=unit, threshold=10))
            count += 1
        db.commit()
        return {"message": f"Uploaded {count} items"}
    except Exception as e: db.rollback(); raise HTTPException(400, f"Error: {str(e)}")

# --- Treatment Management (With Recipes) ---

@doctor_router.get("/treatments")
def get_doc_treatments(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get treatments WITH their recipe list."""
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    treatments = db.query(models.Treatment).filter(models.Treatment.hospital_id == doc.hospital_id).all()
    
    results = []
    for t in treatments:
        recipe = []
        for link in t.required_items:
            recipe.append({
                "item_name": link.item.name,
                "qty_required": link.quantity_required,
                "unit": link.item.unit
            })
        results.append({
            "id": t.id,
            "name": t.name,
            "cost": t.cost,
            "description": t.description,
            "recipe": recipe
        })
    return results

@doctor_router.post("/treatments")
def create_treatment(data: schemas.TreatmentCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    db.add(models.Treatment(hospital_id=doc.hospital_id, name=data.name, cost=data.cost, description=data.description))
    db.commit(); return {"message": "Created"}

@doctor_router.post("/treatments/upload")
def upload_treatments(file: UploadFile = File(...), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403)
    doctor = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    try:
        csvReader = csv.DictReader(codecs.iterdecode(file.file, 'utf-8'))
        count = 0
        for row in csvReader:
            data = {k.lower().strip(): v.strip() for k, v in row.items() if k}
            name = data.get('treatment name') or data.get('name')
            cost_str = data.get('cost') or data.get('price')
            desc = data.get('description') or ""
            if not name or not cost_str: continue
            try: cost = float(cost_str)
            except: continue
            existing = db.query(models.Treatment).filter(models.Treatment.hospital_id == doctor.hospital_id, models.Treatment.name == name).first()
            if existing: existing.cost = cost
            else: db.add(models.Treatment(hospital_id=doctor.hospital_id, name=name, cost=cost, description=desc))
            count += 1
        db.commit()
        return {"message": f"Uploaded {count} treatments"}
    except Exception as e: db.rollback(); raise HTTPException(400, f"Error: {str(e)}")

@doctor_router.post("/treatments/{tid}/link-inventory")
def link_inv(tid: int, data: schemas.TreatmentLinkCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if link exists to update, or create new
    link = db.query(models.TreatmentInventoryLink).filter(
        models.TreatmentInventoryLink.treatment_id == tid,
        models.TreatmentInventoryLink.item_id == data.item_id
    ).first()
    
    if link:
        link.quantity_required = data.quantity
    else:
        db.add(models.TreatmentInventoryLink(treatment_id=tid, item_id=data.item_id, quantity_required=data.quantity))
    
    db.commit()
    return {"message": "Linked successfully"}

# --- Appointments & Schedule ---

@doctor_router.get("/schedule")
def get_schedule(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    return db.query(models.Appointment).filter(models.Appointment.doctor_id == doc.id).order_by(models.Appointment.start_time).all()

@doctor_router.post("/appointments/{id}/start")
def start_appointment(id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    appt = db.query(models.Appointment).filter(models.Appointment.id == id, models.Appointment.doctor_id == doc.id).first()
    if not appt: raise HTTPException(404)
    if appt.status != "confirmed": return {"message": "Already started or completed"}
    
    appt.status = "in_progress"
    db.commit()
    return {"message": "Started", "status": "in_progress"}

@doctor_router.post("/appointments/{id}/complete")
def complete_appointment(id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    appt = db.query(models.Appointment).filter(models.Appointment.id == id, models.Appointment.doctor_id == doc.id).first()
    if not appt: raise HTTPException(404)
    if appt.status == "completed": return {"message": "Already completed"}
    
    # 1. Update Invoice to Paid
    inv = db.query(models.Invoice).filter(models.Invoice.appointment_id == appt.id).first()
    if inv:
        inv.status = "paid"
    else:
        # Create paid invoice if it didn't exist
        t = db.query(models.Treatment).filter(models.Treatment.name == appt.treatment_type, models.Treatment.hospital_id == doc.hospital_id).first()
        amount = t.cost if t else 0
        db.add(models.Invoice(appointment_id=appt.id, patient_id=appt.patient_id, amount=amount, status="paid"))

    # 2. Deduct Inventory (Recipe Logic)
    treatment = db.query(models.Treatment).filter(models.Treatment.name == appt.treatment_type, models.Treatment.hospital_id == doc.hospital_id).first()
    if treatment:
        for link in treatment.required_items:
            # Safely deduct, avoiding negative numbers if possible
            if link.item.quantity >= link.quantity_required:
                link.item.quantity -= link.quantity_required
            else:
                link.item.quantity = 0

    # 3. Complete Appointment
    appt.status = "completed"
    db.commit()
    return {"message": "Completed", "status": "completed"}

# --- Patient Management (With File Uploads) ---

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
def get_patient_details(id: int, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(models.Patient).filter(models.Patient.id == id).first()
    if not p: raise HTTPException(404, "Patient not found")

    recs = db.query(models.MedicalRecord).filter(models.MedicalRecord.patient_id == id).all()
    
    # Fetch Files
    files = db.query(models.PatientFile).filter(models.PatientFile.patient_id == p.id).order_by(models.PatientFile.uploaded_at.desc()).all()

    return {
        "id": p.id, 
        "full_name": p.user.full_name, 
        "age": p.age, 
        "gender": p.gender, 
        "history": [{"date": r.date.strftime("%Y-%m-%d"), "diagnosis": r.diagnosis, "prescription": r.prescription, "doctor_name": r.doctor.user.full_name} for r in recs],
        "files": [{"id": f.id, "filename": f.filename, "path": f.filepath, "date": f.uploaded_at.strftime("%Y-%m-%d")} for f in files]
    }

@doctor_router.post("/patients/{patient_id}/files")
def upload_patient_file(patient_id: int, file: UploadFile = File(...), user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != "doctor": raise HTTPException(403, "Access denied")
    
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if not patient: raise HTTPException(404, "Patient not found")

    # Save File
    file_location = f"media/{patient_id}_{file.filename}"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # DB Entry
    db_file = models.PatientFile(
        patient_id=patient_id,
        filename=file.filename,
        filepath=file_location
    )
    db.add(db_file)
    db.commit()
    
    return {"message": "File uploaded successfully"}

@doctor_router.post("/patients/{id}/records")
def add_rec(id: int, data: schemas.RecordCreate, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    db.add(models.MedicalRecord(patient_id=id, doctor_id=doc.id, diagnosis=data.diagnosis, prescription=data.prescription, notes=data.notes, date=datetime.utcnow()))
    db.commit()
    return {"message": "Saved"}

@doctor_router.get("/finance")
def get_fin(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(models.Doctor).filter(models.Doctor.user_id == user.id).first()
    invs = db.query(models.Invoice).join(models.Appointment).filter(models.Appointment.doctor_id == doc.id).all()
    return {"total_revenue": sum(i.amount for i in invs if i.status=="paid"), "total_pending": sum(i.amount for i in invs if i.status=="pending"), "invoices": []}

# ================= AUTH & ADMIN (ROBUST) =================

@auth_router.post("/login")
def login(f: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.email == f.username.lower().strip()).first()
    if not u or not verify_password(f.password, u.password_hash): raise HTTPException(403)
    if not u.is_email_verified: raise HTTPException(403, "Email not verified")
    return {"access_token": create_access_token({"sub": str(u.id), "role": u.role}), "token_type": "bearer", "role": u.role}

@auth_router.post("/register")
def reg(u: schemas.UserCreate, bg: BackgroundTasks, db: Session = Depends(get_db)):
    email_clean = u.email.lower().strip()
    if db.query(models.User).filter(models.User.email == email_clean, models.User.is_email_verified == True).first(): raise HTTPException(400, "Email exists")
    
    otp = generate_otp()
    expires = datetime.utcnow() + timedelta(minutes=10)
    
    existing = db.query(models.User).filter(models.User.email == email_clean).first()
    if existing:
        existing.otp_code = otp
        existing.otp_expires_at = expires
        existing.password_hash = get_password_hash(u.password)
        existing.full_name = u.full_name
        db.commit()
    else:
        nw = models.User(email=email_clean, password_hash=get_password_hash(u.password), full_name=u.full_name, role=u.role, otp_code=otp, otp_expires_at=expires, is_email_verified=False)
        db.add(nw); db.flush()
        if u.role == "organization": db.add(models.Hospital(owner_id=nw.id, name=u.full_name, address=u.address, is_verified=False))
        elif u.role == "patient": db.add(models.Patient(user_id=nw.id, age=u.age, gender=u.gender))
        elif u.role == "doctor":
            h = db.query(models.Hospital).filter(models.Hospital.name == u.hospital_name).first()
            if h: db.add(models.Doctor(user_id=nw.id, hospital_id=h.id, specialization=u.specialization, license_number=u.license_number))
        db.commit()
    
    bg.add_task(lambda e, o: email_service.send(e, "OTP", o) if email_service else print(f"OTP: {o}"), email_clean, otp)
    return {"message": "OTP sent"}

@auth_router.post("/verify-otp")
def v_otp(d: schemas.VerifyOTP, db: Session = Depends(get_db)):
    u = db.query(models.User).filter(models.User.email == d.email.lower().strip()).first()
    if not u: raise HTTPException(400, "User not found")
    if u.is_email_verified: return {"message": "Verified", "role": u.role}
    if u.otp_expires_at and datetime.utcnow() > u.otp_expires_at: raise HTTPException(400, "OTP expired")
    if str(u.otp_code).strip() != str(d.otp.strip()): raise HTTPException(400, "Invalid OTP")
    u.is_email_verified = True; u.otp_code = None; db.commit()
    return {"message": "Verified", "role": u.role}

@auth_router.get("/me")
def me(u: models.User = Depends(get_current_user)): return u

@auth_router.get("/hospitals")
def get_hosps(db: Session = Depends(get_db)): return [{"id": h.id, "name": h.name, "address": h.address} for h in db.query(models.Hospital).filter(models.Hospital.is_verified==True).all()]

@admin_router.get("/doctors")
def get_ad_docs(db: Session = Depends(get_db)): return [{"id": d.id, "name": d.user.full_name, "is_verified": d.is_verified} for d in db.query(models.Doctor).all()]

@admin_router.get("/organizations")
def get_ad_orgs(db: Session = Depends(get_db)): return [{"id": h.id, "name": h.name, "is_verified": h.is_verified} for h in db.query(models.Hospital).all()]

@admin_router.post("/approve-account/{id}")
def approve(id: int, type: str, db: Session = Depends(get_db)):
    if type == "doctor": d = db.query(models.Doctor).filter(models.Doctor.id == id).first(); d.is_verified = True
    elif type == "organization": h = db.query(models.Hospital).filter(models.Hospital.id == id).first(); h.is_verified = True
    db.commit(); return {"message": "Approved"}

@org_router.get("/stats")
def org_stats(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    h = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
    dids = [d.id for d in h.doctors]
    rev = db.query(func.sum(models.Invoice.amount)).join(models.Appointment).filter(models.Appointment.doctor_id.in_(dids), models.Invoice.status == "paid").scalar() or 0
    return {"total_doctors": len(h.doctors), "total_patients": 0, "total_revenue": rev, "utilization_rate": 80}

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth_router); app.include_router(admin_router); app.include_router(org_router); app.include_router(doctor_router); app.include_router(public_router)
app.mount("/media", StaticFiles(directory="media"), name="media")