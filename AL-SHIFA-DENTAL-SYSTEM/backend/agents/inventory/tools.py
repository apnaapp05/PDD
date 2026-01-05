from sqlalchemy.orm import Session
from sqlalchemy import func
import models

class InventoryTools:
    def __init__(self, db: Session):
        self.db = db

    def _get_doctor_hospital(self, user_id: int):
        doctor = self.db.query(models.Doctor).filter(models.Doctor.user_id == user_id).first()
        if not doctor or not doctor.hospital_id:
            return None
        return doctor.hospital_id

    def get_stock(self, user_id: int, item_name: str = None):
        hospital_id = self._get_doctor_hospital(user_id)
        if not hospital_id:
            return "Error: You are not linked to a hospital."

        query = self.db.query(models.InventoryItem).filter(models.InventoryItem.hospital_id == hospital_id)
        
        if item_name:
            # Fuzzy search for item name
            item = query.filter(models.InventoryItem.name.ilike(f"%{item_name}%")).first()
            if item:
                return f"{item.name}: {item.quantity} {item.unit} (Threshold: {item.threshold})"
            return f"Item '{item_name}' not found in inventory."
        
        # List all items
        items = query.all()
        if not items:
            return "Inventory is empty."
        
        return "\n".join([f"- {i.name}: {i.quantity} {i.unit}" for i in items])

    def update_stock(self, user_id: int, item_name: str, quantity_change: int):
        hospital_id = self._get_doctor_hospital(user_id)
        if not hospital_id:
            return "Error: You are not linked to a hospital."

        item = self.db.query(models.InventoryItem).filter(
            models.InventoryItem.hospital_id == hospital_id,
            models.InventoryItem.name.ilike(f"%{item_name}%")
        ).first()

        if not item:
            # If trying to add positive stock to a new item, we might need a separate 'create' flow, 
            # but for simplicity, the agent will say item not found.
            return f"Item '{item_name}' not found. Please create it manually first."

        new_qty = item.quantity + quantity_change
        if new_qty < 0:
            return f"Cannot reduce stock below 0. Current stock: {item.quantity}"

        item.quantity = new_qty
        self.db.commit()
        
        action = "Added" if quantity_change > 0 else "Removed"
        return f"Successfully {action} {abs(quantity_change)} to {item.name}. New Balance: {item.quantity} {item.unit}."

    def check_low_stock(self, user_id: int):
        hospital_id = self._get_doctor_hospital(user_id)
        if not hospital_id:
            return "Error: No hospital found."

        items = self.db.query(models.InventoryItem).filter(
            models.InventoryItem.hospital_id == hospital_id,
            models.InventoryItem.quantity <= models.InventoryItem.threshold
        ).all()

        if not items:
            return "All items are well stocked."
        
        return "⚠️ Low Stock Alert:\n" + "\n".join([f"- {i.name}: {i.quantity} (Threshold: {i.threshold})" for i in items])