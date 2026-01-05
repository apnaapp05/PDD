import os

# Security
SECRET_KEY = "alshifa_super_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 

# Database Configuration (PostgreSQL)
# Format: postgresql://username:password@localhost:port/database_name
DATABASE_URL = "postgresql://postgres:ADLAB@127.0.0.1:5432/alshifa_db"

# AI Configuration
# PASTE YOUR GEMINI API KEY BELOW inside the quotes
GEMINI_API_KEY = "your API key here" 

# Agent Settings
MAX_AGENT_STEPS = 5

#AIzaSyAccxVtjqPgbMoTYr6l-oplruKAUalcMKo