"""Cliente da API Highlightly para enriquecer jogos ao vivo.

Busca eventos (gols, cartões, VAR), lineups e estatísticas de jogos
em andamento. Dados efêmeros — só importam durante o jogo.

Cobertura: 950+ ligas, 170+ países. Free tier: 100 req/dia.
Base URL: https://soccer.highlightly.net
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import asyncpg
from curl_cffi import requests

from app.config import settings
from app.services import teams
from app.services.cache import cache

logger = logging.getLogger(__name__)

BASE_URL = "https://soccer.highlightly.net"
CACHE_KEY_PREFIX = "highlightly:match_id:"
CACHE_KEY_DATE_PREFIX = "highlightly:date:"
CACHE_TTL_IDS = 86400  # 24h — IDs dos jogos são estáveis
CACHE_TTL_DATA = 600   # 10min — dados ao vivo (lineups atualizam a cada 10min)


def _headers() -> dict[str, str]:
    return {
        "x-rapidapi-key": settings.HIGHLIGHTLY_API_KEY,
        "x-rapidapi-host": "football-highlights-api.p.rapidapi.com",
        "Content-Type": "application/json",
    }


def _fetch_matches_by_date(date_str: str) -> list[dict]:
    """GET /matches?date=YYYY-MM-DD — lista jogos do dia."""
    cache_key = f"{CACHE_KEY_DATE_PREFIX}{date_str}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    if not settings.HIGHLIGHTLY_API_KEY:
        logger.warning("HIGHLIGHTLY_API_KEY not configured")
        return []

    try:
        response = requests.get(
            f"{BASE_URL}/matches",
            params={"date": date_str, "limit": 100},
            headers=_headers(),
            impersonate="chrome",
            timeout=15,
        )
        if response.status_code != 200:
            logger.warning("Highlightly returned %d", response.status_code)
            return []

        data = response.json()
        matches = data.get("data", [])
        cache.set(cache_key, matches, CACHE_TTL_DATA)
        return matches
    except Exception:
        logger.exception("Error fetching Highlightly matches")
        return []


async def get_matches_by_date(date_str: str) -> list[dict]:
    return await asyncio.to_thread(_fetch_matches_by_date, date_str)


def _fetch_match_detail(match_id: int) -> Optional[dict]:
    """GET /matches/{id} — detalhes completos (eventos, lineups, stats)."""
    if not settings.HIGHLIGHTLY_API_KEY:
        return None

    try:
        response = requests.get(
            f"{BASE_URL}/matches/{match_id}",
            headers=_headers(),
            impersonate="chrome",
            timeout=15,
        )
        if response.status_code != 200:
            logger.warning("Highlightly match %d returned %d", match_id, response.status_code)
            return None

        data = response.json()
        if isinstance(data, list) and len(data) > 0:
            return data[0]
        return data if isinstance(data, dict) else None
    except Exception:
        logger.exception("Error fetching Highlightly match %d", match_id)
        return None


async def get_match_detail(match_id: int) -> Optional[dict]:
    return await asyncio.to_thread(_fetch_match_detail, match_id)


def _dates_match(match_date: str, our_date: str) -> bool:
    """Compara datas com tolerância de 1h."""
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
    """Compara times da Highlightly (em inglês) com o jogo do DB (em PT).

    Usa o dicionário canônico teams.TEAM_DICT para resolver PT→EN.
    """
    if not time_a_pt or not time_b_pt:
        return True

    en_a = teams.get_en(time_a_pt)
    en_b = teams.get_en(time_b_pt)
    if not en_a or not en_b:
        logger.warning(
            f"highlightly _teams_match: PT sem mapping ({time_a_pt!r}, {time_b_pt!r})"
        )
        return True

    api_home = (match.get("homeTeam") or {}).get("name", "")
    api_away = (match.get("awayTeam") or {}).get("name", "")

    direct = api_home == en_a and api_away == en_b
    swapped = api_home == en_b and api_away == en_a
    return direct or swapped


async def get_highlightly_id(jogo: asyncpg.Record) -> Optional[int]:
    """Faz match do jogo do DB com o ID da Highlightly.

    Estratégia:
    1. Tenta cache (sofascore_id → highlightly_id)
    2. Se não tem, query /matches?date= e faz match por time+data
    3. Cacheia o resultado por 24h
    """
    sofascore_id = jogo.get("sofascore_id")
    if not sofascore_id:
        return None

    cache_key = f"{CACHE_KEY_PREFIX}{sofascore_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    data_hora = jogo.get("data_hora")
    if not data_hora:
        return None

    date_str = data_hora.strftime("%Y-%m-%d") if isinstance(data_hora, datetime) else str(data_hora)[:10]
    matches = await get_matches_by_date(date_str)

    if not matches:
        return None

    time_a_pt = jogo.get("time_a")
    time_b_pt = jogo.get("time_b")

    candidatos: list[dict] = []
    for match in matches:
        match_date = match.get("date", "")
        if not _dates_match(match_date, data_hora.isoformat() if isinstance(data_hora, datetime) else data_hora):
            continue
        if not _teams_match(match, time_a_pt=time_a_pt, time_b_pt=time_b_pt):
            continue
        candidatos.append(match)

    if len(candidatos) == 0:
        logger.debug(f"Highlightly: nenhum match para {time_a_pt}x{time_b_pt} em {date_str}")
        return None

    if len(candidatos) > 1:
        logger.warning(
            f"Highlightly: {len(candidatos)} candidatos para {time_a_pt}x{time_b_pt}. "
            "Descartando para evitar match ambíguo."
        )
        return None

    highlightly_id = candidatos[0].get("id")
    if highlightly_id:
        cache.set(cache_key, highlightly_id, CACHE_TTL_IDS)
        logger.info(
            f"Highlightly: match OK {time_a_pt}x{time_b_pt} → ID {highlightly_id}"
        )
    return highlightly_id


def _fetch_lineups(match_id: int) -> Optional[dict]:
    """GET /lineups/{id} — escalação completa (titulares + suplentes)."""
    if not settings.HIGHLIGHTLY_API_KEY:
        return None

    try:
        response = requests.get(
            f"{BASE_URL}/lineups/{match_id}",
            headers=_headers(),
            impersonate="chrome",
            timeout=15,
        )
        if response.status_code != 200:
            logger.warning("Highlightly lineups %d returned %d", match_id, response.status_code)
            return None

        data = response.json()
        return data if isinstance(data, dict) else None
    except Exception:
        logger.exception("Error fetching Highlightly lineups %d", match_id)
        return None


async def get_lineups(match_id: int) -> Optional[dict]:
    return await asyncio.to_thread(_fetch_lineups, match_id)


def _parse_events(match_detail: dict) -> list[dict[str, Any]]:
    """Extrai eventos relevantes do match detail."""
    events_raw = match_detail.get("events", [])
    events: list[dict[str, Any]] = []

    for event in events_raw:
        event_type = event.get("type", "")
        team_data = event.get("team", {})
        team_id = team_data.get("id")

        home_team = match_detail.get("homeTeam", {})
        away_team = match_detail.get("awayTeam", {})
        home_id = home_team.get("id")

        time_str = event.get("time", "")
        player = event.get("player", "")
        assist = event.get("assist", "")
        substituted = event.get("substituted", "")

        event_data = {
            "minuto": time_str,
            "tipo": event_type,
            "jogador": player,
            "time": "timeA" if team_id == home_id else "timeB",
            "assistencia": assist if assist else None,
        }

        if event_type == "Substitution" and substituted:
            event_data["substituido"] = substituted

        events.append(event_data)

    return events


def _parse_lineups(lineups_data: dict) -> dict[str, Any]:
    """Extrai lineups completas do endpoint /lineups/{id}.

    Estrutura: initialLineup (array de arrays por linha de formação),
    substitutes, formation.
    """
    home_team = lineups_data.get("homeTeam", {})
    away_team = lineups_data.get("awayTeam", {})

    def parse_team_lineup(team_data: dict) -> dict[str, Any]:
        initial_lineup_raw = team_data.get("initialLineup", [])
        substitutes_raw = team_data.get("substitutes", [])
        formation = team_data.get("formation", "")

        titulares = []
        for row in initial_lineup_raw:
            for player in row:
                titulares.append({
                    "nome": player.get("name", ""),
                    "numero": player.get("number"),
                    "posicao": player.get("position", ""),
                })

        suplentes = [
            {
                "nome": p.get("name", ""),
                "numero": p.get("number"),
                "posicao": p.get("position", ""),
            }
            for p in substitutes_raw
        ]

        return {
            "titulares": titulares,
            "suplentes": suplentes,
            "formacao": formation,
        }

    return {
        "timeA": parse_team_lineup(home_team),
        "timeB": parse_team_lineup(away_team),
    }


def _parse_statistics(match_detail: dict) -> dict[str, Any]:
    """Extrai estatísticas do match detail."""
    stats_raw = match_detail.get("statistics", [])
    stats: dict[str, Any] = {}

    for team_stats in stats_raw:
        team_data = team_stats.get("team", {})
        team_id = team_data.get("id")
        team_key = "timeA" if team_id == match_detail.get("homeTeam", {}).get("id") else "timeB"

        team_stats_list = team_stats.get("statistics", [])
        for stat in team_stats_list:
            display_name = stat.get("displayName", "").lower()
            value = stat.get("value")

            if "posse" in display_name or "possession" in display_name:
                stats[f"{team_key}_posse"] = value
            elif "expected" in display_name or "xg" in display_name:
                stats[f"{team_key}_xg"] = value
            elif "big chance" in display_name or "grande chance" in display_name:
                stats[f"{team_key}_grandes_chances"] = value
            elif "goalkeeper save" in display_name or "defesa" in display_name or "save" in display_name:
                stats[f"{team_key}_defesas"] = value
            elif "chute" in display_name or "shot" in display_name:
                if "gol" in display_name or "target" in display_name:
                    stats[f"{team_key}_chutes_gol"] = value
                else:
                    stats[f"{team_key}_chutes"] = value
            elif "escanteio" in display_name or "corner" in display_name:
                stats[f"{team_key}_escanteios"] = value
            elif "falta" in display_name or "foul" in display_name:
                stats[f"{team_key}_faltas"] = value
            elif "yellow card" in display_name or "cartão amarelo" in display_name:
                stats[f"{team_key}_cartoes_amarelos"] = value
            elif "red card" in display_name or "cartão vermelho" in display_name:
                stats[f"{team_key}_cartoes_vermelhos"] = value
            elif "cartão" in display_name or "card" in display_name:
                stats[f"{team_key}_cartoes"] = value

    return stats


async def enrich_live_game(jogo: asyncpg.Record) -> Optional[dict[str, Any]]:
    """Busca eventos/stats de um jogo ao vivo na Highlightly.

    Retorna dict pronto pra UPDATE nas colunas JSONB, ou None se falhar.

    Para jogos em andamento: busca eventos + stats (lineups já foram buscadas
    pelo enrich_lineups_only() antes do jogo começar).
    """
    highlightly_id = await get_highlightly_id(jogo)
    if not highlightly_id:
        return None

    match_detail = await get_match_detail(highlightly_id)
    if not match_detail:
        return None

    eventos = _parse_events(match_detail)
    estatisticas = _parse_statistics(match_detail)

    return {
        "eventos_ao_vivo": eventos,
        "estatisticas": estatisticas,
    }


async def enrich_lineups_only(jogo: asyncpg.Record) -> Optional[dict[str, Any]]:
    """Busca APENAS lineups de um jogo (para jogos agendados próximos).

    Retorna dict com lineups, ou None se falhar ou já existirem.

    Lógica:
    - Se jogo.lineups já existe → retorna None (não re-busca)
    - Se jogo.lineups é NULL → busca /lineups e retorna
    """
    existing_lineups = jogo.get("lineups")
    if existing_lineups:
        return None

    highlightly_id = await get_highlightly_id(jogo)
    if not highlightly_id:
        return None

    lineups_data = await get_lineups(highlightly_id)
    if not lineups_data:
        return None

    return {
        "lineups": _parse_lineups(lineups_data),
    }
