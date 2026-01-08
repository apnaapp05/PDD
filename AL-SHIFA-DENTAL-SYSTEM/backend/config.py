import os

# Security
SECRET_KEY = "alshifa_super_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 

# Database Configuration (PostgreSQL)
# Format: postgresql://username:password@localhost:port/database_name
DATABASE_URL = "sqlite:///./dental_clinic.db"

# AI Configuration
# PASTE YOUR GEMINI API KEY BELOW inside the quotes
GEMINI_API_KEY = "AIzaSyBhwDmB8YfCPYwbXNSR4P44dY97pgN_gts" 

# Agent Settings
MAX_AGENT_STEPS = 5

#AIzaSyBhwDmB8YfCPYwbXNSR4P44dY97pgN_gts