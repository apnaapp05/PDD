import time
from collections import defaultdict
from threading import Lock


class RateLimiter:
    """
    Thread-safe sliding window rate limiter.
    """

    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)
        self.lock = Lock()

    def allow(self, key: str) -> bool:
        with self.lock:
            now = time.time()
            window_start = now - self.window_seconds

            self.requests[key] = [
                t for t in self.requests[key] if t > window_start
            ]

            if len(self.requests[key]) >= self.max_requests:
                return False

            self.requests[key].append(now)
            return True
