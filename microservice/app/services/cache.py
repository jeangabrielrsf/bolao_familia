import time
from typing import Any, Optional


class InMemoryCache:
    def __init__(self) -> None:
        self._store: dict[str, tuple[Any, float]] = {}

    def get(self, key: str) -> Optional[Any]:
        if key in self._store:
            value, expires_at = self._store[key]
            if time.time() < expires_at:
                return value
            del self._store[key]
        return None

    def set(self, key: str, value: Any, ttl: int) -> None:
        self._store[key] = (value, time.time() + ttl)

    def clear(self) -> None:
        self._store.clear()


cache = InMemoryCache()
