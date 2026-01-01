import time
from typing import Callable, Dict, Any


class RetryQueue:
    """
    In-memory retry queue.
    Safe default for MVP.
    Replace with Redis/Celery later.
    """

    def __init__(self, max_retries: int = 3, delay_seconds: int = 2):
        self.max_retries = max_retries
        self.delay_seconds = delay_seconds

    def execute(self, func: Callable, payload: Dict[str, Any]):
        attempt = 0
        last_error = None

        while attempt < self.max_retries:
            try:
                return func(**payload)
            except Exception as e:
                last_error = e
                attempt += 1
                time.sleep(self.delay_seconds)

        raise RuntimeError(
            f"RetryQueue exhausted after {self.max_retries} attempts"
        ) from last_error
