from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

# Ensure we can connect
try:
    models.Base.metadata.create_all(bind=engine)
    print("✅ Database Connection Successful.\n")
except Exception as e:
    print(f"❌ Database Connection FAILED: {e}")
    exit()

def get_otp(email):
    db: Session = SessionLocal()
    try:
        # 1. Fetch User
        user = db.query(models.User).filter(models.User.email == email).first()
        
        if not user:
            print(f"❌ User with email '{email}' NOT FOUND in database.")
            print("   (Did you register with a different email or typo?)")
            return

        # 2. Print Details
        print(f"--- User Details ---")
        print(f"ID:       {user.id}")
        print(f"Email:    {user.email}")
        print(f"Role:     {user.role}")
        print(f"Verified: {user.is_email_verified}")
        print(f"--------------------")
        print(f"🔑 CURRENT OTP IN DB:  [{user.otp_code}]")
        print(f"--------------------")
        
        if user.otp_code is None and not user.is_email_verified:
             print("⚠️ OTP is NULL but user is not verified. Try registering again.")

    except Exception as e:
        print(f"❌ Error reading data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # REPLACE THIS with the email you are trying to verify
    target_email = input("Enter the email to check: ").strip()
    get_otp(target_email)