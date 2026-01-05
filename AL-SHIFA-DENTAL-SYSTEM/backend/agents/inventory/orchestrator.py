from sqlalchemy.orm import Session
from agents.base_agent import BaseAgent
from agents.inventory.tools import InventoryTools
import json

class InventoryAgent(BaseAgent):
    def __init__(self, db: Session):
        super().__init__(
            name="Inventory Agent", 
            instructions="""
            You are an intelligent inventory assistant for a dental clinic.
            Your capabilities:
            1. Check stock levels (e.g., "Do we have gloves?", "List all items").
            2. Update stock (e.g., "Used 5 masks", "Added 100 vials of anesthesia").
            3. Check for low stock alerts.
            
            Tools available:
            - get_stock(item_name: str) -> Returns stock count. If item_name is null, lists all.
            - update_stock(item_name: str, quantity_change: int) -> Updates count. Use negative numbers for usage.
            - check_low_stock() -> Returns list of items below threshold.
            """
        )
        self.tools = InventoryTools(db)

    def process(self, query: str, user_id: int, user_role: str):
        if user_role != "doctor":
            return {"response": "Only doctors can manage inventory.", "action_taken": None}
            
        # 1. THINK: Ask LLM what to do
        # We pass the user_id implicitly to tools, so the LLM just needs to extract parameters.
        decision = self.think(query, context=f"User ID: {user_id}")
        
        # 2. ACT: Execute tool if requested
        if decision.status == "PENDING_TOOL":
            tool_name = decision.tool_call["function_name"]
            params = decision.tool_call["arguments"] or {}
            
            result = "Tool not found."
            
            try:
                if tool_name == "get_stock":
                    result = self.tools.get_stock(user_id, params.get("item_name"))
                elif tool_name == "update_stock":
                    qty = int(params.get("quantity_change", 0))
                    result = self.tools.update_stock(user_id, params.get("item_name"), qty)
                elif tool_name == "check_low_stock":
                    result = self.tools.check_low_stock(user_id)
            except Exception as e:
                result = f"Error executing tool: {str(e)}"

            # 3. OBSERVE & RESPOND: Return the tool result as the final answer
            # In a more complex agent, we would feed this 'result' back to 'think()' for a natural language summary.
            # For speed, we return the result directly or wrap it.
            return {
                "response": str(result),
                "action_taken": tool_name
            }
            
        # Fallback if no tool needed (e.g., "Hi")
        return {
            "response": decision.final_response,
            "action_taken": None
        }