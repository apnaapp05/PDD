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
    print("🌱 Seeding Test Data (p@p.p, d@d.d, o@o.o)...")
    db = SessionLocal()
    try:
        # 1. ORGANIZATION (o@o.o / o)
        org = models.User(
            email="o@o.o", password_hash=get_hash("o"),
            full_name="o o", role="organization", is_email_verified=True
            # Removed phone_number (not in User model)
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        hospital = models.Hospital(
            owner_id=org.id, name="o o", 
            address="123 Test St", is_verified=True,
            phone_number="111-222-3333" # Moved here (Hospital model has phone_number)
        )
        db.add(hospital)
        db.commit()
        db.refresh(hospital)

        # 2. DOCTOR (d@d.d / d)
        doc = models.User(
            email="d@d.d", password_hash=get_hash("d"),
            full_name="d d", role="doctor", is_email_verified=True
            # Removed phone_number
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        doc_profile = models.Doctor(
            user_id=doc.id, hospital_id=hospital.id,
            specialization="General Dentist", license_number="TEST-DOC-ID",
            is_verified=True
        )
        db.add(doc_profile)
        db.commit()

        # 3. PATIENT (p@p.p / p)
        pat = models.User(
            email="p@p.p", password_hash=get_hash("p"),
            full_name="p p", role="patient", is_email_verified=True
            # Removed phone_number
        )
        db.add(pat)
        db.commit()
        db.refresh(pat)

        pat_profile = models.Patient(
            user_id=pat.id, age=30, gender="Male"
        )
        db.add(pat_profile)
        db.commit()

        print("✅ Test data created!")

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