import asyncio
import logging
from typing import Optional

from curl_cffi import requests

from app.services import teams
from app.services.cache import cache

logger = logging.getLogger(__name__)

BASE_URL = "https://worldcup26.ir"
CACHE_KEY_ALL = "worldcup26:all_matches"
CACHE_KEY_STADIUMS = "worldcup26:stadiums"
CACHE_TTL = 300


def _fetch_all_matches() -> list[dict]:
    cached = cache.get(CACHE_KEY_ALL)
    if cached is not None:
        return cached

    try:
        response = requests.get(
            f"{BASE_URL}/get/games",
            timeout=15,
        )
        if response.status_code != 200:
            logger.warning("worldcup26.ir returned %d", response.status_code)
            return []

        data = response.json()
        matches = data.get("games", [])
        cache.set(CACHE_KEY_ALL, matches, CACHE_TTL)
        return matches
    except Exception:
        logger.exception("Error fetching worldcup26.ir matches")
        return []


async def get_all_matches() -> list[dict]:
    return await asyncio.to_thread(_fetch_all_matches)


def _fetch_stadiums() -> dict[int, dict]:
    cached = cache.get(CACHE_KEY_STADIUMS)
    if cached is not None:
        return cached

    try:
        response = requests.get(
            f"{BASE_URL}/get/stadiums",
            timeout=15,
        )
        if response.status_code != 200:
            logger.warning("worldcup26.ir stadiums returned %d", response.status_code)
            return {}

        data = response.json()
        stadiums_list = data.get("stadiums", [])
        stadiums = {int(s["id"]): s for s in stadiums_list}
        cache.set(CACHE_KEY_STADIUMS, stadiums, CACHE_TTL)
        return stadiums
    except Exception:
        logger.exception("Error fetching worldcup26.ir stadiums")
        return {}


async def get_stadiums() -> dict[int, dict]:
    return await asyncio.to_thread(_fetch_stadiums)


def _parse_date(date_str: str) -> str:
    from datetime import datetime
    try:
        dt = datetime.strptime(date_str, "%m/%d/%Y %H:%M")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return date_str[:10] if len(date_str) >= 10 else ""


def _dates_match(match_date: str, our_date: str) -> bool:
    from datetime import datetime, timedelta

    try:
        dt_match = datetime.fromisoformat(match_date.replace("Z", "+00:00"))
        dt_ours = datetime.fromisoformat(our_date.replace("Z", "+00:00"))
        diff = abs((dt_match - dt_ours).total_seconds())
        return diff < 1 * 3600
    except (ValueError, AttributeError):
        return False


def _teams_match(
    match: dict,
    *,
    time_a_pt: str | None,
    time_b_pt: str | None,
) -> bool:
    """Compara times do worldcup26 (em inglês) com o jogo do DB (em PT).

    Estratégia: usa o dicionário canônico `teams.TEAM_DICT` para resolver
    o nome PT → nome EN que o worldcup26 retorna. Aceita home/away em
    qualquer ordem.
    """
    if not time_a_pt or not time_b_pt:
        return True

    en_a = teams.get_en(time_a_pt)
    en_b = teams.get_en(time_b_pt)
    if not en_a or not en_b:
        logger.warning(
            f"worldcup26 _teams_match: PT sem mapping ({time_a_pt!r}, "
            f"{time_b_pt!r}) — assumindo match"
        )
        return True

    api_home = match.get("home_team_name_en", "")
    api_away = match.get("away_team_name_en", "")

    direct = api_home == en_a and api_away == en_b
    swapped = api_home == en_b and api_away == en_a
    return direct or swapped


def _normalize_status(time_elapsed: str, finished: str) -> str:
    if finished.upper() == "TRUE" or time_elapsed.lower() == "finished":
        return "finished"
    if time_elapsed.lower() == "notstarted":
        return "notstarted"
    return "inprogress"


def _derive_winner(home_score: int, away_score: int) -> Optional[int]:
    if home_score > away_score:
        return 1
    elif away_score > home_score:
        return 2
    return 3


def match_game(
    matches: list[dict],
    group: str,
    data_hora: str,
    stadiums: dict[int, dict],
    *,
    time_a_pt: str | None = None,
    time_b_pt: str | None = None,
) -> Optional[dict]:
    """Encontra o jogo do worldcup26 que casa com o jogo do DB.

    Critérios:
    1. Mesmo grupo
    2. Data dentro de 1h
    3. Times batem (nome EN do worldcup26 vs PT→EN via teams.TEAM_DICT)

    Retorna None se:
    - Nenhum candidato
    - 2+ candidatos com times diferentes (ambigüidade — log warning)

    Args:
        matches: lista de jogos do worldcup26.ir
        group: letra do grupo do jogo do DB
        data_hora: ISO 8601 UTC do jogo do DB
        stadiums: dict de estádios (id -> info)
        time_a_pt: nome PT do timeA do DB
        time_b_pt: nome PT do timeB do DB
    """
    group_upper = group.upper() if group else None

    candidatos: list[dict] = []
    for match in matches:
        if group_upper is not None:
            if (match.get("group", "") or "").upper() != group_upper:
                continue

        local_date = match.get("local_date", "")
        match_date_utc = _convert_local_to_utc(local_date, match.get("stadium_id"))

        if not _dates_match(match_date_utc, data_hora):
            continue

        if not _teams_match(match, time_a_pt=time_a_pt, time_b_pt=time_b_pt):
            continue

        candidatos.append(match)

    if len(candidatos) == 0:
        return None

    if len(candidatos) > 1:
        logger.warning(
            f"worldcup26 match_game: {len(candidatos)} candidatos para "
            f"grupo={group} dataHora={data_hora} pt={time_a_pt}x{time_b_pt}. "
            f"Descartando."
        )
        return None

    match = candidatos[0]
    try:
        home_score = int(match.get("home_score", 0))
        away_score = int(match.get("away_score", 0))
    except (ValueError, TypeError):
        home_score = 0
        away_score = 0

    stadium_id = int(match.get("stadium_id", 0))
    stadium = stadiums.get(stadium_id, {})

    status = _normalize_status(
        match.get("time_elapsed", ""),
        match.get("finished", "FALSE"),
    )

    result = {
        "resultadoA": home_score,
        "resultadoB": away_score,
        "status": status,
        "local": stadium.get("name_en"),
        "cidade": stadium.get("city_en"),
        "vencedor": _derive_winner(home_score, away_score) if status == "finished" else None,
        "placarPenaltisA": None,
        "placarPenaltisB": None,
    }
    logger.info(
        f"worldcup26 match_game OK: grupo={group} pt={time_a_pt}x{time_b_pt} "
        f"en_api={match.get('home_team_name_en')}x{match.get('away_team_name_en')} "
        f"status={status} placar={result['resultadoA']}x{result['resultadoB']}"
    )
    return result


def _convert_local_to_utc(local_date: str, stadium_id: str) -> str:
    from datetime import datetime, timedelta

    try:
        dt_local = datetime.strptime(local_date, "%m/%d/%Y %H:%M")
    except ValueError:
        return local_date

    offset_hours = _get_stadium_utc_offset(stadium_id)
    dt_utc = dt_local - timedelta(hours=offset_hours)
    return dt_utc.isoformat() + "Z"


def _get_stadium_utc_offset(stadium_id: str) -> float:
    offsets = {
        "1": -6,   # Estadio Azteca, Mexico City (CDT)
        "2": -6,   # Estadio Akron, Guadalajara (CDT)
        "3": -6,   # Estadio BBVA, Monterrey (CDT)
        "4": -5,   # AT&T Stadium, Dallas/Arlington (CDT)
        "5": -5,   # NRG Stadium, Houston (CDT)
        "6": -5,   # GEHA Field at Arrowhead Stadium, Kansas City (CDT)
        "7": -4,   # Mercedes-Benz Stadium, Atlanta (EDT)
        "8": -4,   # Hard Rock Stadium, Miami (EDT)
        "9": -4,   # Gillette Stadium, Boston/Foxborough (EDT)
        "10": -4,  # Lincoln Financial Field, Philadelphia (EDT)
        "11": -4,  # MetLife Stadium, New York/New Jersey (EDT)
        "12": -4,  # BMO Field, Toronto (EDT)
        "13": -7,  # Levi's Stadium, San Francisco/Santa Clara (PDT)
        "14": -7,  # Lumen Field, Seattle (PDT)
        "15": -7,  # SoFi Stadium, LA/Inglewood (PDT)
        "16": -7,  # SoFi Stadium, LA/Inglewood (PDT)
    }
    return offsets.get(stadium_id, -5)


async def get_match_result(
    group: str,
    data_hora: str,
) -> Optional[dict]:
    matches = await get_all_matches()
    stadiums = await get_stadiums()

    if not matches:
        return None

    return match_game(matches, group, data_hora, stadiums)
