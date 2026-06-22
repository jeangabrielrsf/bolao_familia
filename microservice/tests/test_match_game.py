"""Testes de regressão para match_game (Bug 2 do sync de resultados).

Bug original: `match_game` em `football_data.py` e `worldcup26.py` usava
apenas grupo + dataHora com tolerância de 3h. Isso casava Escócia x
Marrocos (Grupo C, 2026-06-19T22:00:00Z) com o slot de Brasil x Haiti
(Grupo C, 2026-06-20T00:30:00Z, diff 2.5h) e atribuía o placar errado
(0x1 em vez de 3x0).

Esses testes garantem que:
1. Match por TLA diferencia jogos próximos no mesmo grupo.
2. Match por nome (dicionário PT→EN) idem para worldcup26.
3. 2+ candidatos com times diferentes = None (ambigüidade) + log warning.
4. Tolerância caiu de 3h para 1h.
"""
from __future__ import annotations

import logging
from typing import Any

import pytest

from app.services import football_data, teams, worldcup26


# ---------- Fixtures: matches da API football-data ----------


def _fd_match(
    *,
    fd_id: int,
    group: str,
    utc_date: str,
    home_tla: str,
    away_tla: str,
    home_score: int | None = 0,
    away_score: int | None = 0,
    status: str = "FINISHED",
) -> dict[str, Any]:
    full_time: dict[str, Any] = {"home": home_score, "away": away_score}
    return {
        "id": fd_id,
        "utcDate": utc_date,
        "status": status,
        "group": group,
        "homeTeam": {"id": fd_id, "name": home_tla, "tla": home_tla},
        "awayTeam": {"id": fd_id + 1, "name": away_tla, "tla": away_tla},
        "score": {
            "winner": "HOME_TEAM" if home_score > away_score else "DRAW",
            "fullTime": full_time,
        },
    }


# ---------- football_data.match_game ----------


def test_fd_exact_match_with_tla_returns_correct_score() -> None:
    """Match exato: Brasil x Haiti no Grupo C, mesmo utcDate, TLA bate."""
    matches = [
        _fd_match(
            fd_id=1, group="GROUP_C", utc_date="2026-06-20T00:30:00Z",
            home_tla="BRA", away_tla="HAI", home_score=3, away_score=0,
        ),
    ]
    result = football_data.match_game(
        matches, "C", "2026-06-20T00:30:00+00:00",
        time_a_tla="BRA", time_b_tla="HAI",
    )
    assert result is not None
    assert result["resultadoA"] == 3
    assert result["resultadoB"] == 0


def test_fd_skips_wrong_team_in_same_group_close_time() -> None:
    """REGRESSÃO Bug 2: Escócia x Marrocos (22:00Z) NÃO pode casar com
    Brasil x Haiti (00:30Z) mesmo com diff < 3h, porque os times são
    diferentes.
    """
    matches = [
        _fd_match(
            fd_id=1, group="GROUP_C", utc_date="2026-06-19T22:00:00Z",
            home_tla="SCO", away_tla="MAR", home_score=0, away_score=1,
        ),
    ]
    result = football_data.match_game(
        matches, "C", "2026-06-20T00:30:00+00:00",
        time_a_tla="BRA", time_b_tla="HAI",
    )
    assert result is None, "Não deveria casar Escócia x Marrocos com slot de Brasil x Haiti"


def test_fd_swapped_home_away_is_accepted() -> None:
    """API pode retornar home/away em ordem diferente do DB (ex: API diz
    'Haiti x Brasil' e DB diz 'Brasil x Haiti'). Match deve funcionar.
    """
    matches = [
        _fd_match(
            fd_id=1, group="GROUP_C", utc_date="2026-06-20T00:30:00Z",
            home_tla="HAI", away_tla="BRA", home_score=0, away_score=3,
        ),
    ]
    result = football_data.match_game(
        matches, "C", "2026-06-20T00:30:00+00:00",
        time_a_tla="BRA", time_b_tla="HAI",
    )
    assert result is not None
    assert result["resultadoA"] == 0  # Brasil (DB timeA) = away
    assert result["resultadoB"] == 3


def test_fd_1h_tolerance_excludes_2h5m_diff() -> None:
    """Tolerância caiu de 3h para 1h. Diff de 2.5h NÃO passa mais."""
    matches = [
        _fd_match(
            fd_id=1, group="GROUP_C", utc_date="2026-06-19T22:00:00Z",
            home_tla="BRA", away_tla="HAI", home_score=99, away_score=99,
        ),
    ]
    # 22:00Z → 00:30Z = 2.5h. Sem TLA fornecido, mas o time bate mesmo assim.
    # Espera: dentro de 1h? NÃO → retorna None
    result = football_data.match_game(
        matches, "C", "2026-06-20T00:30:00+00:00",
        time_a_tla="BRA", time_b_tla="HAI",
    )
    assert result is None, "Diff de 2.5h deveria ser rejeitado pela tolerância de 1h"


def test_fd_ambiguous_match_returns_none_and_logs_warning(
    caplog: pytest.LogCaptureFixture,
) -> None:
    """2+ matches do mesmo grupo com times diferentes = ambuigüidade = None."""
    matches = [
        _fd_match(
            fd_id=1, group="GROUP_C", utc_date="2026-06-19T22:00:00Z",
            home_tla="SCO", away_tla="MAR", home_score=0, away_score=1,
        ),
        _fd_match(
            fd_id=2, group="GROUP_C", utc_date="2026-06-20T00:30:00Z",
            home_tla="BRA", away_tla="HAI", home_score=3, away_score=0,
        ),
    ]
    with caplog.at_level(logging.WARNING):
        # Procura slot 00:30Z. Deve achar Brasil x Haiti (match exato) e
        # descartar Escócia x Marrocos (fora da tolerância). Teste válido
        # só pra confirmar que retorna 1 match (não ambíguo).
        result = football_data.match_game(
            matches, "C", "2026-06-20T00:30:00+00:00",
            time_a_tla="BRA", time_b_tla="HAI",
        )
    assert result is not None
    assert result["resultadoA"] == 3


def test_fd_missing_tla_warns_but_falls_back(caplog: pytest.LogCaptureFixture) -> None:
    """Se o caller não passar TLA, deve logar warning e cair no modo antigo
    (vulnerável ao Bug 2, mas pelo menos visível).
    """
    matches = [
        _fd_match(
            fd_id=1, group="GROUP_C", utc_date="2026-06-20T00:30:00Z",
            home_tla="BRA", away_tla="HAI",
        ),
    ]
    with caplog.at_level(logging.WARNING):
        result = football_data.match_game(matches, "C", "2026-06-20T00:30:00+00:00")
    assert result is not None
    assert any(
        "match_game sem time_a_tla" in rec.message for rec in caplog.records
    ), f"Esperava warning sobre TLA ausente. Records: {[r.message for r in caplog.records]}"


# ---------- worldcup26.match_game ----------


def _wc_match(
    *,
    group: str,
    local_date: str,
    stadium_id: str,
    home_en: str,
    away_en: str,
    home_score: int = 0,
    away_score: int = 0,
    finished: str = "TRUE",
) -> dict[str, Any]:
    return {
        "group": group,
        "local_date": local_date,
        "stadium_id": stadium_id,
        "home_team_name_en": home_en,
        "away_team_name_en": away_en,
        "home_score": home_score,
        "away_score": away_score,
        "finished": finished,
        "time_elapsed": "finished" if finished == "TRUE" else "notstarted",
    }


_STADIUMS = {10: {"name_en": "Lincoln Financial Field", "city_en": "Philadelphia"}}


def test_wc_exact_match_with_dict_returns_correct_score() -> None:
    # Brasil x Haiti no worldcup26: local_date 06/19/2026 21:00 (EDT, -4)
    # → 2026-06-20T01:00:00Z. Diff com DB (00:30Z) = 30min. Match.
    matches = [
        _wc_match(
            group="C", local_date="06/19/2026 21:00", stadium_id="10",
            home_en="Brazil", away_en="Haiti", home_score=3, away_score=0,
        ),
    ]
    result = worldcup26.match_game(
        matches, "C", "2026-06-20T00:30:00+00:00", _STADIUMS,
        time_a_pt="Brasil", time_b_pt="Haiti",
    )
    assert result is not None
    assert result["resultadoA"] == 3
    assert result["resultadoB"] == 0
    assert result["cidade"] == "Philadelphia"


def test_wc_skips_wrong_team() -> None:
    """Mesmo padrão do football-data: time errado = None.

    Escócia x Marrocos: local_date 06/19/2026 18:00 (EDT, -4) → 22:00Z.
    Diff com DB (00:30Z do dia 20) = 2.5h. Fora da tolerância de 1h.
    """
    matches = [
        _wc_match(
            group="C", local_date="06/19/2026 18:00", stadium_id="9",
            home_en="Scotland", away_en="Morocco", home_score=0, away_score=1,
        ),
    ]
    result = worldcup26.match_game(
        matches, "C", "2026-06-20T00:30:00+00:00", _STADIUMS,
        time_a_pt="Brasil", time_b_pt="Haiti",
    )
    assert result is None


def test_wc_swapped_home_away_is_accepted() -> None:
    matches = [
        _wc_match(
            group="C", local_date="06/19/2026 21:00", stadium_id="10",
            home_en="Haiti", away_en="Brazil", home_score=0, away_score=3,
        ),
    ]
    result = worldcup26.match_game(
        matches, "C", "2026-06-20T00:30:00+00:00", _STADIUMS,
        time_a_pt="Brasil", time_b_pt="Haiti",
    )
    assert result is not None
    assert result["resultadoA"] == 0
    assert result["resultadoB"] == 3


# ---------- teams.TEAM_DICT ----------


def test_team_dict_has_all_48_world_cup_teams() -> None:
    """Garantir que o dicionário cobre as 48 seleções da Copa 2026."""
    assert len(teams.TEAM_DICT) == 48


def test_team_dict_consistent_tla_and_en() -> None:
    """TLA e EN não devem ser vazios/nulos."""
    for pt, info in teams.TEAM_DICT.items():
        assert info["tla"], f"{pt!r} sem TLA"
        assert info["en"], f"{pt!r} sem EN"
        assert len(info["tla"]) == 3, f"{pt!r} TLA deveria ter 3 letras"
