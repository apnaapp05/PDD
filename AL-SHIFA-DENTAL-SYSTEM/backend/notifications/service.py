from notifications.whatsapp import WhatsAppAdapter
from notifications.email import EmailAdapter
from infra.retry_queue import RetryQueue
from infra.monitoring import MonitoringLogger


class NotificationService:
    """
    Resilient Notification Service
    - Retry on failure
    - Audited
    """

    def __init__(self):
        self.whatsapp = WhatsAppAdapter()
        self.email = EmailAdapter()
        self.retry_queue = RetryQueue()

    def notify_whatsapp(self, to_number: str, message: str):
        MonitoringLogger.log(
            agent="notification",
            action="whatsapp_send_attempt",
            payload={"to": to_number}
        )

        return self.retry_queue.execute(
            self.whatsapp.send,
            {
                "to_number": to_number,
                "message": message
            }
        )

    def notify_email(self, to_email: str, subject: str, body: str):
        MonitoringLogger.log(
            agent="notification",
            action="email_send_attempt",
            payload={"to": to_email, "subject": subject}
        )

        return self.retry_queue.execute(
            self.email.send,
            {
                "to_email": to_email,
                "subject": subject,
                "body": body
            }
        )
