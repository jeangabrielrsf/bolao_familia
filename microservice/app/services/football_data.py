from typing import Optional

from curl_cffi import requests

from app.config import settings
from app.services.cache import cache

BASE_URL = "https://api.football-data.org/v4"


def _headers() -> dict[str, str]:
    return {
        "X-Auth-Token": settings.FOOTBALL_DATA_API_KEY,
        "Content-Type": "application/json",
    }


def get_match_result(match_id: str) -> Optional[dict]:
    cache_key = f"football_data:{match_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    if not settings.FOOTBALL_DATA_API_KEY:
        return None

    try:
        response = requests.get(
            f"{BASE_URL}/matches/{match_id}",
            headers=_headers(),
            impersonate="chrome",
            timeout=10,
        )
        if response.status_code != 200:
            return None

        data = response.json()
        score = data.get("score", {})
        full_time = score.get("fullTime", {})
        home_score = full_time.get("home")
        away_score = full_time.get("away")
        match_status = data.get("status", "UNKNOWN")

        if home_score is None or away_score is None:
            return None

        result = {
            "resultadoA": int(home_score),
            "resultadoB": int(away_score),
            "status": match_status.lower(),
        }
        cache.set(cache_key, result, settings.CACHE_TTL_SECONDS)
        return result
    except Exception:
        return None
