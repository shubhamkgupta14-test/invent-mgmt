import asyncio
import time
from collections import defaultdict, deque

from app.core.exceptions import raise_http_exception


class InMemoryRateLimiter:
    def __init__(self):
        self._attempts = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def check(self, key: str, limit: int, window_seconds: int):
        now = time.monotonic()
        cutoff = now - window_seconds

        async with self._lock:
            attempts = self._attempts[key]
            while attempts and attempts[0] <= cutoff:
                attempts.popleft()

            if len(attempts) >= limit:
                retry_after = max(int(window_seconds - (now - attempts[0])), 1)
                raise_http_exception(
                    429,
                    f"Too many attempts. Try again in {retry_after} seconds.",
                )

            attempts.append(now)


rate_limiter = InMemoryRateLimiter()


def client_ip(request):
    return request.client.host if request.client else "unknown"
