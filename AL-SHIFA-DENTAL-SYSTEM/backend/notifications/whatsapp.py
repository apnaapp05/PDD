from datetime import datetime


class WhatsAppAdapter:
    """
    Mock WhatsApp adapter.
    Replace with Twilio / Meta API later.
    """

    def send(self, to_number: str, message: str):
        print({
            "channel": "whatsapp",
            "to": to_number,
            "message": message,
            "timestamp": datetime.utcnow().isoformat()
        })
        return {"status": "sent"}
