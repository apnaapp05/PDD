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
            full_name="o o", role="organization", is_email_verified=True,
            phone_number="111-222-3333", address="Test Org HQ"
        )
        db.add(org)
        db.commit()
        db.refresh(org)

        hospital = models.Hospital(
            owner_id=org.id, name="o o", 
            # REMOVED 'location' which caused the error
            address="123 Test St", is_verified=True
        )
        db.add(hospital)
        db.commit()
        db.refresh(hospital)

        # 2. DOCTOR (d@d.d / d)
        doc = models.User(
            email="d@d.d", password_hash=get_hash("d"),
            full_name="d d", role="doctor", is_email_verified=True,
            phone_number="444-555-6666", address="Doctor Lane"
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
            full_name="p p", role="patient", is_email_verified=True,
            phone_number="777-888-9999", address="Patient Street"
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
    with engine.connect() as conn:
        try:
            # This drops the public schema and recreates it to ensure a clean slate
            conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
            conn.commit()
            print("✅ Database wiped successfully.")
        except Exception as e:
            print(f"❌ Error dropping tables: {e}")
            return

    print("🏗️  Recreating tables...")
    try:
        Base.metadata.create_all(bind=engine)
        seed_test_data() # Run the seeder
    except Exception as e:
        print(f"❌ Error creating tables: {e}")

if __name__ == "__main__":
    reset_tables()