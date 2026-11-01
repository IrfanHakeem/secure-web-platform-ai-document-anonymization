import time
from collections import defaultdict, deque
from threading import Lock


class SlidingWindowRateLimiter:
    """In-memory sliding-window rate limiter keyed by a string.

    Limits are enforced per-key (e.g. client IP) with a rolling window.
    Thread-safe via a module-level lock. In-memory by design: limits
    reset on process restart, which is acceptable for a single-instance
    deployment. Swap the backing store for Redis if you scale to
    multiple Uvicorn workers.
    """

    def __init__(
        self,
        max_requests: int,
        window_seconds: int,
    ) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def is_allowed(self, key: str) -> bool:
        now = time.monotonic()
        cutoff = now - self.window_seconds

        with self._lock:
            window = self._hits[key]

            # Drop timestamps that have fallen out of the window.
            while window and window[0] < cutoff:
                window.popleft()

            if len(window) >= self.max_requests:
                return False

            window.append(now)
            return True


# Authentication endpoints. Tuned for a small user base: enough headroom
# for legitimate use, tight enough to blunt brute-force and email flooding.
login_limiter = SlidingWindowRateLimiter(
    max_requests=10,
    window_seconds=60,
)

otp_request_limiter = SlidingWindowRateLimiter(
    max_requests=3,
    window_seconds=60,
)
