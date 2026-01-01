from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

# Yahan apna Password aur IP (127.0.0.1) daalein
DATABASE_URL = "postgresql://postgres:ADLAB@127.0.0.1:5432/alshifa_db"

def test_connection():
    try:
        engine = create_engine(DATABASE_URL)
        with engine.connect() as connection:
            print("✅ SUCCESS: Database connected successfully!")
    except OperationalError as e:
        print("❌ ERROR: Connection failed!")
        print(e)

if __name__ == "__main__":
    test_connection()