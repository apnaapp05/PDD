from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Database URL (Default PostgreSQL format)
# Format: postgresql://user:password@localhost/dbname
# Make sure '127.0.0.1:5432' is here
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:ADLAB@127.0.0.1:5432/alshifa_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()