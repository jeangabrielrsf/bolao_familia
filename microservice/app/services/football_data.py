import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

from curl_cffi import requests

from app.config import settings
from app.services.cache import cache

logger = logging.getLogger(__name__)

BASE_URL = "https://api.football-data.org/v4"
WC_COMPETITION = "WC"
CACHE_KEY_ALL = "football_data:wc_matches"
CACHE_TTL = 300


def _headers() -> dict[str, str]:
    return {
        "X-Auth-Token": settings.FOOTBALL_DATA_API_KEY,
        "Content-Type": "application/json",
    }


def _fetch_all_wc_matches() -> list[dict]:
    cached = cache.get(CACHE_KEY_ALL)
    if cached is not None:
        return cached

    if not settings.FOOTBALL_DATA_API_KEY:
        logger.warning("FOOTBALL_DATA_API_KEY not configured")
        return []

    try:
        response = requests.get(
            f"{BASE_URL}/competitions/{WC_COMPETITION}/matches",
            headers=_headers(),
            impersonate="chrome",
            timeout=15,
        )
        if response.status_code != 200:
            logger.warning("football-data.org returned %d", response.status_code)
            return []

        data = response.json()
        matches = data.get("matches", [])
        cache.set(CACHE_KEY_ALL, matches, CACHE_TTL)
        return matches
    except Exception:
        logger.exception("Error fetching football-data.org WC matches")
        return []


async def get_all_wc_matches() -> list[dict]:
    return await asyncio.to_thread(_fetch_all_wc_matches)


def _normalize_group(grupo: str) -> str:
    return f"GROUP_{grupo.upper()}"


def _dates_match(match_date: str, our_date: str) -> bool:
    try:
        dt_match = datetime.fromisoformat(match_date.replace("Z", "+00:00"))
        dt_ours = datetime.fromisoformat(our_date.replace("Z", "+00:00"))
        diff = abs((dt_match - dt_ours).total_seconds())
        return diff < 3 * 3600
    except (ValueError, AttributeError):
        return False


def _normalize_status(status: str) -> str:
    status_map = {
        "FINISHED": "finished",
        "LIVE": "inprogress",
        "IN_PLAY": "inprogress",
        "PAUSED": "inprogress",
        "SCHEDULED": "notstarted",
        "TIMED": "notstarted",
        "POSTPONED": "notstarted",
        "CANCELLED": "notstarted",
    }
    return status_map.get(status.upper(), status.lower())


def _derive_winner(home_score: int, away_score: int, score_winner: str) -> Optional[int]:
    if score_winner == "HOME_TEAM":
        return 1
    elif score_winner == "AWAY_TEAM":
        return 2
    elif score_winner == "DRAW":
        return 3
    if home_score > away_score:
        return 1
    elif away_score > home_score:
        return 2
    return 3


def match_game(
    matches: list[dict],
    group: str,
    data_hora: str,
) -> Optional[dict]:
    group_normalized = _normalize_group(group)

    for match in matches:
        match_group = match.get("group", "")
        if match_group != group_normalized:
            continue

        utc_date = match.get("utcDate", "")
        if not _dates_match(utc_date, data_hora):
            continue

        score = match.get("score", {})
        full_time = score.get("fullTime", {})
        home_score = full_time.get("home") or 0
        away_score = full_time.get("away") or 0
        penalties = score.get("penalties", {})
        status = _normalize_status(match.get("status", "SCHEDULED"))
        score_winner = score.get("winner", "")

        result = {
            "resultadoA": int(home_score),
            "resultadoB": int(away_score),
            "status": status,
            "local": match.get("venue"),
            "cidade": None,
            "vencedor": _derive_winner(home_score, away_score, score_winner) if status == "finished" else None,
            "placarPenaltisA": penalties.get("home"),
            "placarPenaltisB": penalties.get("away"),
        }
        return result

    return None


async def get_match_result(
    group: str,
    data_hora: str,
) -> Optional[dict]:
    matches = await get_all_wc_matches()

    if not matches:
        return None

    return match_game(matches, group, data_hora)
