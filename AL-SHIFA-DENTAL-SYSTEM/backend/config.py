# backend/config.py
import os

# Security
SECRET_KEY = "hhh"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 

# Database
DATABASE_URL = "sqlite:///./dental_clinic.db"

# AI Configuration
# PASTE YOUR GEMINI API KEY BELOW inside the quotes
GEMINI_API_KEY = "YOUR_GEMINI_API_KEY_HERE" 

# Agent Settings
MAX_AGENT_STEPS = 5