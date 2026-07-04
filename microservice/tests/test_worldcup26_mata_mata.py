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
    home_penalty_score: str | int | None = None,
    away_penalty_score: str | int | None = None,
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
        "home_penalty_score": home_penalty_score,
        "away_penalty_score": away_penalty_score,
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


def test_worldcup26_mata_mata_penaltis():
    """Jogo empatado no tempo normal, decidido nos penaltis — vencedor correto."""
    api_match = _wc_match(
        group="R32",
        local_date="07/03/2026 13:00",
        stadium_id=4,
        home_en="Australia",
        away_en="Egypt",
        home_score=1,
        away_score=1,
        home_penalty_score=2,
        away_penalty_score=4,
    )
    result = worldcup26.match_game(
        [api_match],
        "",
        "2026-07-03T18:00:00Z",
        stadiums={},
        time_a_pt="Austrália",
        time_b_pt="Egito",
    )
    assert result is not None
    assert result["resultadoA"] == 1
    assert result["resultadoB"] == 1
    assert result["placarPenaltisA"] == 2
    assert result["placarPenaltisB"] == 4
    assert result["vencedor"] == 2  # Egito (away) venceu nos penaltis


def test_worldcup26_mata_mata_penaltis_string():
    """Penaltis podem vir como string da API."""
    api_match = _wc_match(
        group="R32",
        local_date="07/03/2026 13:00",
        stadium_id=4,
        home_en="Australia",
        away_en="Egypt",
        home_score=1,
        away_score=1,
        home_penalty_score="2",
        away_penalty_score="4",
    )
    result = worldcup26.match_game(
        [api_match],
        "",
        "2026-07-03T18:00:00Z",
        stadiums={},
        time_a_pt="Austrália",
        time_b_pt="Egito",
    )
    assert result is not None
    assert result["placarPenaltisA"] == 2
    assert result["placarPenaltisB"] == 4
    assert result["vencedor"] == 2


def test_worldcup26_mata_mata_penaltis_null():
    """Penaltis como 'null' string devem ser tratados como None."""
    api_match = _wc_match(
        group="R32",
        local_date="07/03/2026 13:00",
        stadium_id=4,
        home_en="Australia",
        away_en="Egypt",
        home_score=1,
        away_score=1,
        home_penalty_score="null",
        away_penalty_score="null",
    )
    result = worldcup26.match_game(
        [api_match],
        "",
        "2026-07-03T18:00:00Z",
        stadiums={},
        time_a_pt="Austrália",
        time_b_pt="Egito",
    )
    assert result is not None
    assert result["placarPenaltisA"] is None
    assert result["placarPenaltisB"] is None
    assert result["vencedor"] == 3  # empate sem penaltis
