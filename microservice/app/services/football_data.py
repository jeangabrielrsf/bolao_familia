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
        return diff < 1 * 3600
    except (ValueError, AttributeError):
        return False


def _teams_match(
    match: dict,
    *,
    time_a_tla: str | None,
    time_b_tla: str | None,
) -> bool:
    """Compara times do jogo da API com o jogo do DB.

    Estratégia:
    1. Match por TLA (código FIFA, ex: "BRA"). É o método primário e mais
       seguro porque o TLA é estável entre nomes em diferentes línguas.
    2. Fallback: aceita match se nenhum TLA for fornecido (caller sem
       dicionário). NÃO recomendado — fica vulnerável ao bug do Grupo C.
    """
    home_tla = (match.get("homeTeam") or {}).get("tla")
    away_tla = (match.get("awayTeam") or {}).get("tla")

    if time_a_tla and time_b_tla and home_tla and away_tla:
        # Aceita home/away em qualquer ordem (Brasil x Haiti = Haiti x Brasil)
        direct = (home_tla == time_a_tla and away_tla == time_b_tla)
        swapped = (home_tla == time_b_tla and away_tla == time_a_tla)
        return direct or swapped

    if not time_a_tla and not time_b_tla:
        logger.warning(
            "match_game sem time_a_tla/time_b_tla — match por grupo+dataHora "
            "pode cruzar jogos diferentes (bug original do Grupo C)"
        )
        return True

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


def _derive_winner(home_score: int, away_score: int, score_winner: str, home_pen: Optional[int] = None, away_pen: Optional[int] = None) -> Optional[int]:
    # Para jogos com pênaltis, o vencedor é quem ganhou os pênaltis, não o placar regular
    if home_score == away_score and home_pen is not None and away_pen is not None:
        if home_pen > away_pen:
            return 1
        elif away_pen > home_pen:
            return 2
        return 3  # Empate nos pênaltis (não deveria acontecer, mas por segurança)

    # Para jogos sem pênaltis ou com placar diferente, usa o score_winner da API
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
    *,
    time_a_tla: str | None = None,
    time_b_tla: str | None = None,
) -> Optional[dict]:
    """Encontra o jogo da API que casa com o jogo do DB.

    Critérios (todos devem ser satisfeitos):
    1. Mesmo grupo (GROUP_A, GROUP_B, ...)
    2. Data dentro de 1h (era 3h, mas causava cruzamento entre jogos do
       mesmo grupo: Escócia x Marrocos (22:00) cruzava com Brasil x Haiti
       (00:30) com diff de 2.5h)
    3. Times batem (TLA igual, em qualquer ordem)

    Retorna `None` se:
    - Nenhum candidato encontrado
    - 2+ candidatos com times diferentes (ambigüidade) — escreve log warning

    Args:
        matches: lista de matches da API football-data.org
        group: letra do grupo do jogo do DB (ex: "C")
        data_hora: ISO 8601 em UTC do jogo do DB
        time_a_tla: TLA (código FIFA) do timeA do jogo do DB (ex: "BRA")
        time_b_tla: TLA do timeB do jogo do DB
    """
    group_normalized = _normalize_group(group) if group else None

    candidatos: list[dict] = []
    for match in matches:
        if group_normalized is not None:
            match_group = match.get("group", "")
            if match_group != group_normalized:
                continue

        utc_date = match.get("utcDate", "")
        if not _dates_match(utc_date, data_hora):
            continue

        if not _teams_match(
            match, time_a_tla=time_a_tla, time_b_tla=time_b_tla
        ):
            continue

        candidatos.append(match)

    if len(candidatos) == 0:
        return None

    if len(candidatos) > 1:
        logger.warning(
            f"match_game: {len(candidatos)} candidatos para grupo={group} "
            f"dataHora={data_hora} tla={time_a_tla}x{time_b_tla}. "
            f"Descartando para evitar match ambíguo."
        )
        return None

    match = candidatos[0]
    score = match.get("score", {})
    full_time = score.get("fullTime", {})
    regular = score.get("regularTime") or {}
    extra = score.get("extraTime") or {}
    penalties = score.get("penalties") or {}
    # football-data.org v4 retorna campos diferentes por tipo de jogo:
    # - GRUPO: só fullTime populado (regularTime/extraTime/penalties = null)
    # - MATA-MATA sem pen: fullTime populado, regularTime/extraTime populados
    #   com mesmo valor (foi decidido no tempo regulamentar ou na ET)
    # - MATA-MATA com pen: fullTime = regularTime + extraTime + penalties
    #   (running score cumulativo, com pen virando "gol" no total)
    #
    # Para o placar pré-pênaltis (o que importa para o bolao):
    # 1. Se regularTime populado → placar = regularTime + extraTime (direto
    #    da fonte, ignora fullTime bagunçado pelos penalties)
    # 2. Senão → placar = fullTime (não tem pen, então fullTime já é o placar)
    regular_home = regular.get("home")
    regular_away = regular.get("away")
    if regular_home is not None and regular_away is not None:
        home_score = regular_home + (extra.get("home") or 0)
        away_score = regular_away + (extra.get("away") or 0)
    else:
        home_score = full_time.get("home") or 0
        away_score = full_time.get("away") or 0
    has_penalties = (
        penalties.get("home") is not None
        or penalties.get("away") is not None
    )
    status = _normalize_status(match.get("status", "SCHEDULED"))
    score_winner = score.get("winner", "")

    result = {
        "resultadoA": int(home_score),
        "resultadoB": int(away_score),
        "status": status,
        "local": match.get("venue"),
        "cidade": None,
        "vencedor": _derive_winner(home_score, away_score, score_winner, penalties.get("home"), penalties.get("away")) if status == "finished" else None,
        "placarPenaltisA": penalties.get("home"),
        "placarPenaltisB": penalties.get("away"),
    }
    pen_suffix = (
        f" (pen {result['placarPenaltisA']}-{result['placarPenaltisB']})"
        if has_penalties
        else ""
    )
    logger.info(
        f"match_game OK: grupo={group} tla_db={time_a_tla}x{time_b_tla} "
        f"tla_api={match.get('homeTeam', {}).get('tla')}x"
        f"{match.get('awayTeam', {}).get('tla')} status={status} "
        f"placar={result['resultadoA']}x{result['resultadoB']}{pen_suffix}"
    )
    return result


async def get_match_result(
    group: str,
    data_hora: str,
) -> Optional[dict]:
    matches = await get_all_wc_matches()

    if not matches:
        return None

    return match_game(matches, group, data_hora)
