from sqlalchemy.orm import Session
from agents.base_agent import BaseAgent

class InventoryAgent(BaseAgent):
    def __init__(self, db: Session):
        super().__init__(name="Inventory Agent", instructions="You manage supplies and stock levels.")
        self.db = db

    def process(self, query: str, user_id: int, user_role: str):
        if user_role != "doctor":
            return {"response": "Only doctors can manage inventory.", "action_taken": None}
            
        return {
            "response": "Inventory Agent is listening. (Logic coming in next step)",
            "action_taken": None
        }