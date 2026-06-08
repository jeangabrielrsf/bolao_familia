import asyncio
import logging
from typing import Optional

from curl_cffi import requests

from app.config import settings
from app.services.cache import cache

logger = logging.getLogger(__name__)

BASE_URL = "https://api.football-data.org/v4"


def _headers() -> dict[str, str]:
    return {
        "X-Auth-Token": settings.FOOTBALL_DATA_API_KEY,
        "Content-Type": "application/json",
    }


def _fetch_match_result(match_id: str) -> Optional[dict]:
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
            logger.warning("football-data.org returned %d for match %s", response.status_code, match_id)
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
        logger.exception("Error fetching football-data.org match %s", match_id)
        return None


async def get_match_result(match_id: str) -> Optional[dict]:
    return await asyncio.to_thread(_fetch_match_result, match_id)
