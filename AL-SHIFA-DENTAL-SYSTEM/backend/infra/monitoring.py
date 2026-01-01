import logging

logging.basicConfig(
    filename="agent_activity.log",
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)


class MonitoringLogger:
    """
    Central audit & monitoring logger.
    """

    @staticmethod
    def log(agent: str, action: str, payload: dict):
        logging.info(
            f"[AGENT={agent}] ACTION={action} PAYLOAD={payload}"
        )
