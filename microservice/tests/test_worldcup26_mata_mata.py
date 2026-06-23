"""Testes para match_game em mata-mata (sem filtro de grupo) — worldcup26 fallback."""
from __future__ import annotations
from typing import Any

from app.services import worldcup26


def _wc_match(
    *,
    group: str | None,
    local_date: str,
    stadium_id: int,
    home_en: str,
    away_en: str,
    home_score: int = 0,
    away_score: int = 0,
    finished: str = "TRUE",
) -> dict[str, Any]:
    return {
        "group": group,
        "local_date": local_date,
        "stadium_id": str(stadium_id),
        "home_team_name_en": home_en,
        "away_team_name_en": away_en,
        "home_score": home_score,
        "away_score": away_score,
        "time_elapsed": "finished",
        "finished": finished,
    }


def test_worldcup26_mata_mata_sem_grupo_casa_por_data_e_times():
    api_match = _wc_match(
        group="Round of 32",
        local_date="06/29/2026 18:00",
        stadium_id=10,
        home_en="Brazil",
        away_en="Mexico",
        home_score=2,
        away_score=1,
    )
    result = worldcup26.match_game(
        [api_match],
        "",
        "2026-06-29T22:00:00Z",
        stadiums={},
        time_a_pt="Brasil",
        time_b_pt="México",
    )
    assert result is not None
    assert result["resultadoA"] == 2


def test_worldcup26_mata_mata_nao_casa_com_times_diferentes():
    api_match = _wc_match(
        group="Round of 32",
        local_date="06/29/2026 18:00",
        stadium_id=10,
        home_en="Brazil",
        away_en="Mexico",
    )
    result = worldcup26.match_game(
        [api_match],
        "",
        "2026-06-29T22:00:00Z",
        stadiums={},
        time_a_pt="Argentina",
        time_b_pt="México",
    )
    assert result is None


def test_worldcup26_mata_mata_api_retorna_group_none():
    """worldcup26.ir pode retornar group=None para mata-mata — defensivo 'or \"\"' deve casar."""
    api_match = _wc_match(
        group=None,
        local_date="06/29/2026 18:00",
        stadium_id=10,
        home_en="Brazil",
        away_en="Mexico",
        home_score=3,
        away_score=0,
    )
    result = worldcup26.match_game(
        [api_match],
        "",
        "2026-06-29T22:00:00Z",
        stadiums={},
        time_a_pt="Brasil",
        time_b_pt="México",
    )
    assert result is not None
    assert result["resultadoA"] == 3
    assert result["resultadoB"] == 0
