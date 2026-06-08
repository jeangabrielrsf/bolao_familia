import time
from typing import Optional

from curl_cffi import requests

from app.services.cache import cache

BASE_URL = "https://api.sofascore.com/api/v1"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}


def get_event_result(sofascore_id: str) -> Optional[dict]:
    cache_key = f"sofascore:{sofascore_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    try:
        response = requests.get(
            f"{BASE_URL}/sport/football/event/{sofascore_id}",
            headers=HEADERS,
            impersonate="chrome",
            timeout=10,
        )
        if response.status_code != 200:
            return None

        data = response.json()
        event = data.get("event", data)
        home_score = event.get("homeScore", {}).get("current")
        away_score = event.get("awayScore", {}).get("current")
        status_type = event.get("status", {}).get("type", "unknown")

        if home_score is None or away_score is None:
            return None

        result = {
            "resultadoA": int(home_score),
            "resultadoB": int(away_score),
            "status": status_type,
        }
        cache.set(cache_key, result, 300)
        return result
    except Exception:
        return None


def get_all_results(sofascore_ids: list[str]) -> list[dict]:
    results: list[dict] = []
    for i, sofascore_id in enumerate(sofascore_ids):
        result = get_event_result(sofascore_id)
        if result is not None:
            results.append({"sofascoreId": sofascore_id, **result})
        if i < len(sofascore_ids) - 1:
            time.sleep(0.5)
    return results
