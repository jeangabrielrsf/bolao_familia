"""Testes para match_game em mata-mata (sem filtro de grupo).

Copa 2026 introduz 16-avos. Jogo de mata-mata não tem `grupo`, então
match_game deve pular esse filtro e casar só por data + times.
"""
from __future__ import annotations
from typing import Any

from app.services import football_data


def _fd_match(
    *,
    fd_id: int,
    group: str | None,
    utc_date: str,
    home_tla: str,
    away_tla: str,
    home_score: int | None = 0,
    away_score: int | None = 0,
    status: str = "FINISHED",
) -> dict[str, Any]:
    if home_score is not None and away_score is not None:
        if home_score > away_score:
            winner = "HOME_TEAM"
        elif home_score < away_score:
            winner = "AWAY_TEAM"
        else:
            winner = "DRAW"
    else:
        winner = None
    return {
        "id": fd_id,
        "group": group,
        "utcDate": utc_date,
        "status": status,
        "homeTeam": {"id": 1, "name": "Home", "tla": home_tla},
        "awayTeam": {"id": 2, "name": "Away", "tla": away_tla},
        "score": {
            "winner": winner,
            "duration": "REGULAR",
            "fullTime": {"home": home_score, "away": away_score},
            "halfTime": {"home": home_score, "away": away_score},
            "regularTime": {"home": home_score, "away": away_score},
        },
    }


def test_match_game_mata_mata_sem_grupo_casa_por_data_e_times():
    api_match = _fd_match(
        fd_id=1001,
        group="ROUND_OF_32",
        utc_date="2026-06-29T22:00:00Z",
        home_tla="BRA",
        away_tla="MEX",
        home_score=2,
        away_score=1,
    )
    result = football_data.match_game(
        [api_match],
        "",
        "2026-06-29T22:00:00Z",
        time_a_tla="BRA",
        time_b_tla="MEX",
    )
    assert result is not None
    assert result["resultadoA"] == 2
    assert result["resultadoB"] == 1


def test_match_game_mata_mata_nao_casa_com_times_diferentes():
    api_match = _fd_match(
        fd_id=1001,
        group="ROUND_OF_32",
        utc_date="2026-06-29T22:00:00Z",
        home_tla="BRA",
        away_tla="MEX",
    )
    result = football_data.match_game(
        [api_match],
        "",
        "2026-06-29T22:00:00Z",
        time_a_tla="ARG",
        time_b_tla="MEX",
    )
    assert result is None


def test_match_game_mata_mata_respeita_tolerancia_1h():
    api_match = _fd_match(
        fd_id=1001,
        group="ROUND_OF_32",
        utc_date="2026-06-29T22:00:00Z",
        home_tla="BRA",
        away_tla="MEX",
    )
    result = football_data.match_game(
        [api_match],
        "",
        "2026-06-30T00:00:00Z",
        time_a_tla="BRA",
        time_b_tla="MEX",
    )
    assert result is None


def test_match_game_mata_mata_api_retorna_group_none():
    """football-data.org retorna group=None (não 'ROUND_OF_32') para mata-mata."""
    api_match = _fd_match(
        fd_id=1001,
        group=None,
        utc_date="2026-06-29T22:00:00Z",
        home_tla="BRA",
        away_tla="MEX",
        home_score=3,
        away_score=0,
    )
    result = football_data.match_game(
        [api_match],
        "",
        "2026-06-29T22:00:00Z",
        time_a_tla="BRA",
        time_b_tla="MEX",
    )
    assert result is not None
    assert result["resultadoA"] == 3
    assert result["resultadoB"] == 0
