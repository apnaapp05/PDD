# backend/agents/inventory_agent.py

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
from agents.base_agent import BaseAgent

# ==========================================================
# 1. STRUCTURED I/O
# ==========================================================

class InventoryInput(BaseModel):
    agent_type: str = Field(default="inventory")
    role: str                 # admin | organization | doctor
    organization_id: str
    intent: str               # "view" | "consume" | "restock" | "alerts"
    item_id: Optional[str] = None
    quantity: Optional[int] = None


class InventoryResponse(BaseModel):
    organization_id: str
    items: Optional[List[dict]] = None
    alerts: Optional[List[str]] = None
    message: str
    timestamp: str


# ==========================================================
# 2. INVENTORY DATA MODEL (TEMP STORE)
# ==========================================================

class InventoryItem(BaseModel):
    item_id: str
    name: str
    quantity: int
    min_threshold: int
    avg_daily_usage: int
    last_updated: str


# TEMP in-memory inventory (replace with DB later)
INVENTORY_STORE: Dict[str, Dict[str, InventoryItem]] = {
    "ORG_1001": {
        "ITEM_001": InventoryItem(
            item_id="ITEM_001",
            name="Dental Gloves",
            quantity=500,
            min_threshold=200,
            avg_daily_usage=40,
            last_updated=datetime.utcnow().isoformat()
        ),
        "ITEM_002": InventoryItem(
            item_id="ITEM_002",
            name="Anesthetic Carpules",
            quantity=120,
            min_threshold=50,
            avg_daily_usage=10,
            last_updated=datetime.utcnow().isoformat()
        )
    }
}


# ==========================================================
# 3. INVENTORY INTELLIGENCE ENGINE
# ==========================================================

class InventoryIntelligence:

    @staticmethod
    def predict_days_left(item: InventoryItem) -> int:
        if item.avg_daily_usage <= 0:
            return 999
        return max(0, item.quantity // item.avg_daily_usage)

    @staticmethod
    def generate_alerts(items: List[InventoryItem]) -> List[str]:
        alerts = []
        for item in items:
            days_left = InventoryIntelligence.predict_days_left(item)
            if item.quantity <= item.min_threshold:
                alerts.append(
                    f"⚠️ Low stock: {item.name} "
                    f"(Qty: {item.quantity}, ~{days_left} days left)"
                )
        return alerts


# ==========================================================
# 4. INVENTORY AGENT (PROFESSIONAL)
# ==========================================================

class InventoryAgent(BaseAgent):
    """
    Inventory Agent
    ----------------
    ✔ Predictive stock monitoring
    ✔ Organization-level intelligence
    ✔ Role-aware actions
    ✔ Alert generation
    ✔ Router compatible
    """

    def __init__(self):
        super().__init__("inventory")

    async def handle(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        data = InventoryInput(**payload)

        org_inventory = INVENTORY_STORE.get(data.organization_id)
        if not org_inventory:
            return InventoryResponse(
                organization_id=data.organization_id,
                message="Organization inventory not found.",
                timestamp=datetime.utcnow().isoformat()
            ).dict()

        items = list(org_inventory.values())

        # -------------------------------
        # INTENT: VIEW INVENTORY
        # -------------------------------
        if data.intent == "view":
            self.log_action("view_inventory", payload)
            return InventoryResponse(
                organization_id=data.organization_id,
                items=[item.dict() for item in items],
                message="Inventory fetched successfully.",
                timestamp=datetime.utcnow().isoformat()
            ).dict()

        # -------------------------------
        # INTENT: CONSUME ITEM
        # -------------------------------
        if data.intent == "consume":
            if not data.item_id or not data.quantity:
                return InventoryResponse(
                    organization_id=data.organization_id,
                    message="item_id and quantity required.",
                    timestamp=datetime.utcnow().isoformat()
                ).dict()

            item = org_inventory.get(data.item_id)
            if not item:
                return InventoryResponse(
                    organization_id=data.organization_id,
                    message="Item not found.",
                    timestamp=datetime.utcnow().isoformat()
                ).dict()

            item.quantity = max(0, item.quantity - data.quantity)
            item.last_updated = datetime.utcnow().isoformat()

            self.log_action("consume_item", payload)

            return InventoryResponse(
                organization_id=data.organization_id,
                message=f"{data.quantity} units of {item.name} consumed.",
                timestamp=datetime.utcnow().isoformat()
            ).dict()

        # -------------------------------
        # INTENT: RESTOCK ITEM
        # -------------------------------
        if data.intent == "restock":
            if not data.item_id or not data.quantity:
                return InventoryResponse(
                    organization_id=data.organization_id,
                    message="item_id and quantity required.",
                    timestamp=datetime.utcnow().isoformat()
                ).dict()

            item = org_inventory.get(data.item_id)
            if not item:
                return InventoryResponse(
                    organization_id=data.organization_id,
                    message="Item not found.",
                    timestamp=datetime.utcnow().isoformat()
                ).dict()

            item.quantity += data.quantity
            item.last_updated = datetime.utcnow().isoformat()

            self.log_action("restock_item", payload)

            return InventoryResponse(
                organization_id=data.organization_id,
                message=f"{data.quantity} units of {item.name} restocked.",
                timestamp=datetime.utcnow().isoformat()
            ).dict()

        # -------------------------------
        # INTENT: ALERTS
        # -------------------------------
        if data.intent == "alerts":
            alerts = InventoryIntelligence.generate_alerts(items)

            self.log_action("inventory_alerts", payload)

            return InventoryResponse(
                organization_id=data.organization_id,
                alerts=alerts,
                message="Inventory alerts generated.",
                timestamp=datetime.utcnow().isoformat()
            ).dict()

        return InventoryResponse(
            organization_id=data.organization_id,
            message="Unknown inventory intent.",
            timestamp=datetime.utcnow().isoformat()
        ).dict()
