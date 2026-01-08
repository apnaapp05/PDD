# backend/agents/appointment/orchestrator.py

from sqlalchemy.orm import Session
from agents.base_agent import BaseAgent
from agents.appointment.tools import AppointmentTools
import json

class AppointmentAgent(BaseAgent):
    def __init__(self, db: Session):
        # Initialize with instructions for the AI Brain
        super().__init__(
            name="Appointment Agent", 
            instructions="""
            You are a helpful dental clinic receptionist.
            Your goals:
            1. Help patients find available slots (check_availability).
            2. Book appointments when a user confirms a specific slot (book_appointment).
            3. Answer general questions about hours or location.

            Tools available:
            - check_availability(doctor_name: str, date: str) -> Returns list of slots.
            - book_appointment(doctor_name: str, date: str, time: str, patient_id: int) -> Books the slot.
            
            If the user request is vague (e.g. "I want to book"), ask for details.
            """
        )
        self.tools = AppointmentTools(db)

    def process(self, query: str, user_id: int, user_role: str):
        """
        Smart Processing using BaseAgent.think()
        """
        # 1. THINK: Ask the LLM to understand the natural language
        context = f"User Role: {user_role}, User ID: {user_id}"
        decision = self.think(query, context=context)

        # 2. ACT: If the AI wants to use a tool
        if decision.status == "PENDING_TOOL":
            tool_name = decision.tool_call["function_name"]
            params = decision.tool_call["arguments"] or {}

            try:
                if tool_name == "check_availability":
                    # Smart Agent extracted date/doctor from natural text
                    doctors = self.tools.get_available_doctors() # In real app, filter by params['date']
                    return {
                        "response": f"I checked for {params.get('date', 'soon')}. Here are the available doctors: {', '.join([d['name'] for d in doctors])}. When would you like to come?",
                        "action_taken": "checked_availability",
                        "data": doctors
                    }
                
                elif tool_name == "book_appointment":
                    # In a real app, we would call self.tools.book(...) here
                    return {
                        "response": f"I have booked your appointment with {params.get('doctor_name')} on {params.get('date')} at {params.get('time')}. Please arrive 10 mins early!",
                        "action_taken": "booked",
                        "data": params
                    }
            except Exception as e:
                return {"response": f"I tried to help, but encountered an error: {str(e)}", "action_taken": "error"}

        # 3. RESPOND: If no tool is needed (just chat)
        return {
            "response": decision.final_response,
            "action_taken": "chat"
        }