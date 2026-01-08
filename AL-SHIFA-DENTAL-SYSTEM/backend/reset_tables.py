# backend/reset_tables.py

from sqlalchemy import text
from database import engine, Base, SessionLocal
import models 
import bcrypt 

def get_hash(password):
    # Safely hash using bcrypt directly (truncating to avoid limit errors)
    pwd_bytes = password.encode('utf-8')
    if len(pwd_bytes) > 72: pwd_bytes = pwd_bytes[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode('utf-8')

def seed_test_data():
    print("🌱 Seeding Test Data...")
    db = SessionLocal()
    try:
        # --- 1. DEFAULT USERS ---
        print("   > Creating default users (o@o.o, d@d.d, p@p.p)")
        
        # Org
        org = models.User(
            email="o@o.o", password_hash=get_hash("o"),
            full_name="Default Org", role="organization", is_email_verified=True
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        hospital = models.Hospital(
            owner_id=org.id, name="Default Hospital", 
            address="123 Test St", is_verified=True,
            phone_number="111-222-3333"
        )
        db.add(hospital)
        db.commit()
        db.refresh(hospital)

        # Doctor
        doc = models.User(
            email="d@d.d", password_hash=get_hash("d"),
            full_name="Default Doctor", role="doctor", is_email_verified=True
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        doc_profile = models.Doctor(
            user_id=doc.id, hospital_id=hospital.id,
            specialization="General Dentist", license_number="DEF-DOC-001",
            is_verified=True
        )
        db.add(doc_profile)
        db.commit()

        # Patient
        pat = models.User(
            email="p@p.p", password_hash=get_hash("p"),
            full_name="Default Patient", role="patient", is_email_verified=True
        )
        db.add(pat)
        db.commit()
        db.refresh(pat)

        pat_profile = models.Patient(
            user_id=pat.id, age=30, gender="Male"
        )
        db.add(pat_profile)
        db.commit()

        # --- 2. BULK ORGANIZATIONS (5) ---
        print("   > Creating 5 Organizations (o1..o5)")
        new_hospital_ids = []
        for i in range(1, 6):
            email = f"o{i}@o.o"
            org_user = models.User(
                email=email, password_hash=get_hash("o"),
                full_name=f"Org User {i}", role="organization", is_email_verified=True
            )
            db.add(org_user)
            db.commit()
            db.refresh(org_user)

            h_org = models.Hospital(
                owner_id=org_user.id, name=f"Hospital {i}", 
                address=f"Street {i}, City", is_verified=True,
                phone_number=f"555-000-{i:04d}"
            )
            db.add(h_org)
            db.commit()
            db.refresh(h_org)
            new_hospital_ids.append(h_org.id)

        # --- 3. BULK DOCTORS (10) ---
        print("   > Creating 10 Doctors (d1..d10)")
        for i in range(1, 11):
            email = f"d{i}@d.d"
            doc_user = models.User(
                email=email, password_hash=get_hash("d"),
                full_name=f"Doctor User {i}", role="doctor", is_email_verified=True
            )
            db.add(doc_user)
            db.commit()
            db.refresh(doc_user)

            # Assign round-robin to the new hospitals
            target_hospital_id = new_hospital_ids[(i - 1) % len(new_hospital_ids)]

            d_prof = models.Doctor(
                user_id=doc_user.id, hospital_id=target_hospital_id,
                specialization="General Dentist", license_number=f"BULK-DOC-{i:03d}",
                is_verified=True
            )
            db.add(d_prof)
            db.commit()

        # --- 4. BULK PATIENTS (20) ---
        print("   > Creating 20 Patients (p1..p20)")
        for i in range(1, 21):
            email = f"p{i}@p.p"
            pat_user = models.User(
                email=email, password_hash=get_hash("p"),
                full_name=f"Patient User {i}", role="patient", is_email_verified=True
            )
            db.add(pat_user)
            db.commit()
            db.refresh(pat_user)

            p_prof = models.Patient(
                user_id=pat_user.id, age=20 + i, 
                gender="Male" if i % 2 == 0 else "Female"
            )
            db.add(p_prof)
            db.commit()

        print("✅ All test data created successfully!")

    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

def reset_tables():
    print("🔄 STARTING DATABASE RESET...")
    
    # 1. DROP ALL TABLES (Compatible with SQLite & Postgres)
    try:
        Base.metadata.drop_all(bind=engine)
        print("✅ Old tables dropped successfully.")
    except Exception as e:
        print(f"❌ Error dropping tables: {e}")
        return

    # 2. RECREATE TABLES
    print("🏗️  Recreating tables...")
    try:
        Base.metadata.create_all(bind=engine)
        seed_test_data() # Run the seeder
    except Exception as e:
        print(f"❌ Error creating tables: {e}")

if __name__ == "__main__":
    reset_tables()