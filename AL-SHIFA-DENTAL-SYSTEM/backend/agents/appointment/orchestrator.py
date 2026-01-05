from sqlalchemy.orm import Session
from agents.base_agent import BaseAgent
from agents.appointment.tools import AppointmentTools
import json

class AppointmentAgent(BaseAgent):
    def __init__(self, db: Session):
        super().__init__(name="Appointment Agent", instructions="You handle patient bookings. You can check doctor availability and book slots.")
        self.tools = AppointmentTools(db)

    def process(self, query: str, user_id: int, user_role: str):
        # 1. Ask Base Agent (LLM) to decide functionality
        # We inject a specific prompt for appointments
        context = f"User Role: {user_role}. User ID: {user_id}."
        
        # We override the think logic slightly or just use the tool mapper
        # Ideally, we pass the tool definitions to the LLM. For simplicity, we parse intents here.
        
        if "book" in query and user_role == "patient":
            # Extract basic details using LLM or structured parsing
            # For this step, let's assume we want to find a doctor first
            return self.handle_booking_flow(query, user_id)
            
        elif "list" in query or "show" in query:
            doctors = self.tools.get_available_doctors()
            return {
                "response": f"Here are the available doctors: {', '.join([d['name'] for d in doctors])}. Who would you like to see?",
                "data": doctors
            }
            
        return {
            "response": "I can help you book appointments. Would you like to see available doctors?",
            "action_taken": None
        }

    def handle_booking_flow(self, query: str, patient_id: int):
        # This is where the Agentic magic happens.
        # 1. If date/time/doctor missing -> Ask user
        # 2. If present -> Call self.tools.book_appointment()
        
        # Simplified for Step 2 demo:
        return {
            "response": "I see you want to book. Please select a doctor from the list above or tell me 'Book with Dr. X on [Date]'",
            "action_taken": "booking_initiated"
        }