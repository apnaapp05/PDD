from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import bcrypt

# Ensure tables exist
models.Base.metadata.create_all(bind=engine)

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode('utf-8')

def fix_admin():
    db: Session = SessionLocal()
    try:
        email = "admin@system"
        user = db.query(models.User).filter(models.User.email == email).first()

        if user:
            print(f"Found Admin User. Current Role: {user.role}")
            if user.role != "admin":
                user.role = "admin"
                db.commit()
                print("✅ Fixed role to 'admin'.")
            else:
                print("✅ Role is already correct.")
        else:
            print("⚠️ Admin user not found. Creating fresh admin...")
            new_admin = models.User(
                email=email,
                full_name="System Administrator",
                role="admin",
                is_email_verified=True,
                password_hash=get_password_hash("asdf")
            )
            db.add(new_admin)
            db.commit()
            print("✅ Created new Admin user (User: myApp / Pass: asdf)")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_admin()