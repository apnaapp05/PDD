from datetime import datetime


class EmailAdapter:
    """
    Mock Email adapter.
    Replace with SMTP / SendGrid later.
    """

    def send(self, to_email: str, subject: str, body: str):
        print({
            "channel": "email",
            "to": to_email,
            "subject": subject,
            "body": body,
            "timestamp": datetime.utcnow().isoformat()
        })
        return {"status": "sent"}
