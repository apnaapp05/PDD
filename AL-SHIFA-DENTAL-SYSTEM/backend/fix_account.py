from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

# Ensure tables exist
models.Base.metadata.create_all(bind=engine)

def fix_user_role(email):
    db: Session = SessionLocal()
    try:
        # 1. Find the User
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            print(f"❌ User {email} not found!")
            return

        print(f"found User: {user.full_name} (Current Role: {user.role})")

        # 2. Force Role to 'organization'
        if user.role != "organization":
            print(f"⚠️ Fixing role from '{user.role}' to 'organization'...")
            user.role = "organization"
            db.commit()
        else:
            print("✅ Role is already correct.")

        # 3. Ensure Hospital Profile Exists
        hospital = db.query(models.Hospital).filter(models.Hospital.owner_id == user.id).first()
        
        if not hospital:
            print("⚠️ No Hospital profile found. Creating default hospital entry...")
            new_hospital = models.Hospital(
                owner_id=user.id,
                name=user.full_name + " Clinic", # Default name
                address=user.address or "Default Address",
                pincode= "000000",
                lat=0.0,
                lng=0.0,
                is_verified=True # Auto-verify to let you test
            )
            db.add(new_hospital)
            db.commit()
            print("✅ Created new Hospital profile.")
        else:
            print(f"✅ Hospital profile exists: {hospital.name}")

        print("\n🎉 ACCOUNT FIXED SUCCESSFULLY!")
        print("You can now go back to the browser and click 'Send for Approval' again.")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # CHANGE THIS EMAIL to the one giving you errors
    target_email = "o@o.d" 
    fix_user_role(target_email)