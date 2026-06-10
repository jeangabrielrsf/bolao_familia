import asyncio
import logging
from typing import Optional

from curl_cffi import requests

from app.config import settings
from app.services.cache import cache

logger = logging.getLogger(__name__)

BASE_URL = "https://api.sofascore.com/api/v1"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}


def _fetch_event_result(sofascore_id: str) -> Optional[dict]:
    cache_key = f"sofascore:{sofascore_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        response = requests.get(
            f"{BASE_URL}/event/{sofascore_id}",
            headers=HEADERS,
            impersonate="chrome",
            timeout=10,
        )
        if response.status_code != 200:
            logger.warning("Sofascore returned %d for event %s", response.status_code, sofascore_id)
            return None

        data = response.json()
        event = data.get("event", data)
        home_score = event.get("homeScore", {})
        away_score = event.get("awayScore", {})
        status_type = event.get("status", {}).get("type", "unknown")
        venue = event.get("venue", {})
        home_team = event.get("homeTeam", {})
        away_team = event.get("awayTeam", {})

        home_score_current = home_score.get("current")
        away_score_current = away_score.get("current")

        # Para jogos não iniciados, retornar metadados com placar 0
        if status_type == "notstarted":
            result = {
                "resultadoA": 0,
                "resultadoB": 0,
                "status": status_type,
                "local": venue.get("name"),
                "cidade": venue.get("city", {}).get("name"),
                "vencedor": None,
                "rankingTimeA": home_team.get("ranking"),
                "rankingTimeB": away_team.get("ranking"),
                "placarPenaltisA": None,
                "placarPenaltisB": None,
            }
            cache.set(cache_key, result, settings.CACHE_TTL_SECONDS)
            return result

        if home_score_current is None or away_score_current is None:
            return None

        result = {
            "resultadoA": int(home_score.get("display", home_score_current)),
            "resultadoB": int(away_score.get("display", away_score_current)),
            "status": status_type,
            "local": venue.get("name"),
            "cidade": venue.get("city", {}).get("name"),
            "vencedor": event.get("winnerCode"),
            "rankingTimeA": home_team.get("ranking"),
            "rankingTimeB": away_team.get("ranking"),
            "placarPenaltisA": home_score.get("penalties"),
            "placarPenaltisB": away_score.get("penalties"),
        }
        cache.set(cache_key, result, settings.CACHE_TTL_SECONDS)
        return result
    except Exception:
        logger.exception("Error fetching Sofascore event %s", sofascore_id)
        return None


async def get_event_result(sofascore_id: str) -> Optional[dict]:
    return await asyncio.to_thread(_fetch_event_result, sofascore_id)


def _fetch_all_results(sofascore_ids: list[str]) -> list[dict]:
    results: list[dict] = []
    for i, sofascore_id in enumerate(sofascore_ids):
        result = _fetch_event_result(sofascore_id)
        if result is not None:
            results.append({"sofascoreId": sofascore_id, **result})
        if i < len(sofascore_ids) - 1:
            import time
            time.sleep(0.5)
    return results


async def get_all_results(sofascore_ids: list[str]) -> list[dict]:
    return await asyncio.to_thread(_fetch_all_results, sofascore_ids)


async def get_all_results_no_cache(sofascore_ids: list[str]) -> list[dict]:
    for sid in sofascore_ids:
        cache.delete(f"sofascore:{sid}")
    return await get_all_results(sofascore_ids)
