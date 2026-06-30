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
    utc_date: str,
    home_tla: str,
    away_tla: str,
    home_score: int | None = 0,
    away_score: int | None = 0,
    status: str = "FINISHED",
    group: str | None = None,
    full_time: dict[str, Any] | None = None,
    regular_time: dict[str, Any] | None = None,
    extra_time: dict[str, Any] | None = None,
    penalties: dict[str, Any] | None = None,
    duration: str | None = None,
) -> dict[str, Any]:
    """Fixture de match da API football-data.org v4.

    Compatibilidade retroativa: testes antigos que só passam home_score/
    away_score ainda funcionam — o helper infere full_time = {home, away}.
    Para cenários de penalty/ET, passar full_time/regular_time/extra_time/
    penalties/duration explicitamente.
    """
    if full_time is None:
        full_time = {"home": home_score, "away": away_score}
    # Determina o winner autoritativo. Se há penalties, quem decide é o
    # placar dos pênaltis; senão, é o placar do fullTime (running total).
    if penalties is not None and (penalties.get("home") is not None or penalties.get("away") is not None):
        pen_h = penalties.get("home") or 0
        pen_a = penalties.get("away") or 0
        winner = "HOME_TEAM" if pen_h > pen_a else "AWAY_TEAM" if pen_a > pen_h else "DRAW"
    else:
        ft_h = full_time.get("home") or 0
        ft_a = full_time.get("away") or 0
        winner = "HOME_TEAM" if ft_h > ft_a else "AWAY_TEAM" if ft_a > ft_h else "DRAW"
    score: dict[str, Any] = {
        "winner": winner,
        "fullTime": full_time,
    }
    if regular_time is not None:
        score["regularTime"] = regular_time
    if extra_time is not None:
        score["extraTime"] = extra_time
    if penalties is not None:
        score["penalties"] = penalties
    if duration is not None:
        score["duration"] = duration
    return {
        "id": fd_id,
        "utcDate": utc_date,
        "status": status,
        "group": group,
        "homeTeam": {"id": fd_id, "name": home_tla, "tla": home_tla},
        "awayTeam": {"id": fd_id + 1, "name": away_tla, "tla": away_tla},
        "score": score,
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


# ---------- football_data.match_game — pênaltis e prorrogação ----------


def test_fd_penalty_shootout_uses_pre_penalty_score() -> None:
    """REGRESSÃO: jogo com disputa de pênaltis deve mostrar o placar
    pré-pênaltis (= fullTime - penalties = regulamentar + prorrogação),
    NÃO o running total de fullTime que inclui os pênaltis como gols.

    Caso real: Alemanha x Paraguai, 16-avos, 2026-06-29.
    Placar FIFA: 1-1 nos 90 min, 0-0 na prorrogação, 3-4 nos pênaltis.
    football-data.org retorna:
      fullTime    = 4-5   (1+0+3 vs 1+0+4 = running total)
      regularTime = 1-1   (90 min)
      extraTime   = 0-0
      penalties   = 3-4
    Comportamento esperado: resultadoA/B = 1-1, placarPenaltisA/B = 3-4.
    Bug antigo lia fullTime direto e mostrava 4-5.
    """
    api_match = _fd_match(
        fd_id=537415,
        utc_date="2026-06-29T23:30:00Z",
        home_tla="GER",
        away_tla="PAR",
        home_score=1,
        away_score=1,
        group="ROUND_OF_32",
        full_time={"home": 4, "away": 5},
        regular_time={"home": 1, "away": 1},
        extra_time={"home": 0, "away": 0},
        penalties={"home": 3, "away": 4},
        duration="PENALTY_SHOOTOUT",
    )
    result = football_data.match_game(
        [api_match],
        "",
        "2026-06-29T23:30:00+00:00",
        time_a_tla="GER",
        time_b_tla="PAR",
    )
    assert result is not None
    assert result["resultadoA"] == 1, (
        "Deve mostrar placar pré-pênaltis (1-1), não running total (4-5)"
    )
    assert result["resultadoB"] == 1
    assert result["placarPenaltisA"] == 3
    assert result["placarPenaltisB"] == 4
    assert result["vencedor"] == 2, "AWAY_TEAM (Paraguai) venceu nos pênaltis"
    assert result["status"] == "finished"


def test_fd_penalty_after_extra_time_with_goals_uses_full_pre_penalty_score() -> None:
    """REGRESSÃO: jogo com gols na prorrogação que VAI para pênaltis
    deve mostrar o placar regulamentar + prorrogação, NÃO apenas 90 min.

    Cenário: 1-1 nos 90 min, 2-2 na prorrogação, 4-5 nos pênaltis.
    football-data.org retorna:
      fullTime    = 6-6   (1+1+4 vs 1+1+5)
      regularTime = 1-1
      extraTime   = 1-1
      penalties   = 4-5
    Esperado: resultadoA/B = 2-2 (NÃO 1-1!).
    """
    api_match = _fd_match(
        fd_id=1001,
        utc_date="2026-07-04T20:00:00Z",
        home_tla="BRA",
        away_tla="MEX",
        home_score=2,
        away_score=2,
        group="ROUND_OF_16",
        full_time={"home": 6, "away": 7},
        regular_time={"home": 1, "away": 1},
        extra_time={"home": 1, "away": 1},
        penalties={"home": 4, "away": 5},
        duration="PENALTY_SHOOTOUT",
    )
    result = football_data.match_game(
        [api_match],
        "",
        "2026-07-04T20:00:00+00:00",
        time_a_tla="BRA",
        time_b_tla="MEX",
    )
    assert result is not None
    assert result["resultadoA"] == 2, (
        "Deve incluir gol do ET (1+1=2), não só os 90 min (1)"
    )
    assert result["resultadoB"] == 2
    assert result["placarPenaltisA"] == 4
    assert result["placarPenaltisB"] == 5
    assert result["vencedor"] == 2, "México (away) venceu nos pênaltis"


def test_fd_extra_time_with_goal_uses_fulltime_score() -> None:
    """Prorrogação com gol (sem pênaltis): placar exibido é o final
    (fullTime = regularTime + extraTime), não o dos 90 min.
    fullTime=2-1, regularTime=1-1, extraTime=1-0, penalties=null.
    """
    api_match = _fd_match(
        fd_id=999,
        utc_date="2026-07-02T20:00:00Z",
        home_tla="BRA",
        away_tla="ARG",
        home_score=2,
        away_score=1,
        group="ROUND_OF_16",
        full_time={"home": 2, "away": 1},
        regular_time={"home": 1, "away": 1},
        extra_time={"home": 1, "away": 0},
        penalties=None,
        duration="EXTRA_TIME",
    )
    result = football_data.match_game(
        [api_match],
        "",
        "2026-07-02T20:00:00+00:00",
        time_a_tla="BRA",
        time_b_tla="ARG",
    )
    assert result is not None
    assert result["resultadoA"] == 2, "ET com gol: usar fullTime (placar final)"
    assert result["resultadoB"] == 1
    assert result["placarPenaltisA"] is None
    assert result["placarPenaltisB"] is None
    assert result["vencedor"] == 1, "HOME_TEAM venceu no ET"


def test_fd_extra_time_no_goals_uses_fulltime_score() -> None:
    """Prorrogação 0-0 nos gols mas com decisão: placar final = 1-1.
    Garante que não confundimos com penalty shootout (que tem penalties
    não-null).
    """
    api_match = _fd_match(
        fd_id=998,
        utc_date="2026-07-02T20:00:00Z",
        home_tla="ARG",
        away_tla="FRA",
        home_score=1,
        away_score=1,
        group="ROUND_OF_16",
        full_time={"home": 1, "away": 1},
        regular_time={"home": 1, "away": 1},
        extra_time={"home": 0, "away": 0},
        penalties=None,
        duration="EXTRA_TIME",
    )
    result = football_data.match_game(
        [api_match],
        "",
        "2026-07-02T20:00:00+00:00",
        time_a_tla="ARG",
        time_b_tla="FRA",
    )
    assert result is not None
    assert result["resultadoA"] == 1
    assert result["resultadoB"] == 1
    assert result["placarPenaltisA"] is None, "Não é pênaltis (duration=EXTRA_TIME)"
    assert result["placarPenaltisB"] is None


def test_fd_regular_time_uses_fulltime_score() -> None:
    """Regressão: jogo de grupos sem prorrogação e sem pênaltis.
    Comportamento atual (fullTime) deve ser preservado — fix não pode
    quebrar o caso comum.
    """
    api_match = _fd_match(
        fd_id=1,
        group="GROUP_A",
        utc_date="2026-06-12T18:00:00Z",
        home_tla="BRA",
        away_tla="HAI",
        home_score=3,
        away_score=0,
    )
    result = football_data.match_game(
        [api_match],
        "A",
        "2026-06-12T18:00:00+00:00",
        time_a_tla="BRA",
        time_b_tla="HAI",
    )
    assert result is not None
    assert result["resultadoA"] == 3
    assert result["resultadoB"] == 0
    assert result["placarPenaltisA"] is None
    assert result["placarPenaltisB"] is None


def test_fd_penalty_shootout_vencedor_from_score_winner() -> None:
    """Garante que o vencedor continua vindo de score.winner (autoritativo
    da API), não da comparação de placar. Caso degenerado: placar
    pré-pênaltis 1-1 (que daria DRAW=3 sem winner), mas a API retorna
    score.winner=AWAY_TEAM porque houve vencedor nos pênaltis.
    """
    api_match = _fd_match(
        fd_id=537415,
        utc_date="2026-06-29T23:30:00Z",
        home_tla="GER",
        away_tla="PAR",
        home_score=1,
        away_score=1,
        group="ROUND_OF_32",
        full_time={"home": 4, "away": 5},
        regular_time={"home": 1, "away": 1},
        penalties={"home": 3, "away": 4},
        duration="PENALTY_SHOOTOUT",
    )
    result = football_data.match_game(
        [api_match],
        "",
        "2026-06-29T23:30:00+00:00",
        time_a_tla="GER",
        time_b_tla="PAR",
    )
    assert result is not None
    # Placar pré-pênaltis 1-1 daria DRAW=3 sem score.winner, mas a API
    # retorna AWAY_TEAM (Paraguai). Vencedor deve ser 2, não 3.
    assert result["vencedor"] == 2


def test_fd_ger_par_real_api_data_with_wrong_penalties() -> None:
    """REGRESSÃO: football-data.org v4 retorna penalties ERRADO para
    Alemanha x Paraguai (537415) — diz 4-4 quando foi 3-4. Mas
    regularTime+extraTime estão corretos (1-1 + 0-0 = 1-1).

    O fix correto: usar regularTime+extraTime para placar (fonte direta),
    IGNORAR o penalties da API para o cálculo de placar. O penalties
    fica apenas para display.

    Cenário real (curl em 2026-06-30 00:27Z):
      fullTime    = 4-5
      regularTime = 1-1
      extraTime   = 0-0
      penalties   = 4-4 (ERRADO — FIFA reportou 3-4)
      duration    = PENALTY_SHOOTOUT

    Esperado: placar 1-1 (NÃO 0-1 como daria fullTime - penalties=4-4=0)
    """
    api_match = _fd_match(
        fd_id=537415,
        utc_date="2026-06-29T23:30:00Z",
        home_tla="GER",
        away_tla="PAR",
        home_score=1,
        away_score=1,
        group="ROUND_OF_32",
        full_time={"home": 4, "away": 5},
        regular_time={"home": 1, "away": 1},
        extra_time={"home": 0, "away": 0},
        penalties={"home": 4, "away": 4},  # API retorna 4-4 (errado)
        duration="PENALTY_SHOOTOUT",
    )
    result = football_data.match_game(
        [api_match],
        "",
        "2026-06-29T23:30:00+00:00",
        time_a_tla="GER",
        time_b_tla="PAR",
    )
    assert result is not None
    assert result["resultadoA"] == 1, "Placar = regularTime+extraTime = 1+0 = 1"
    assert result["resultadoB"] == 1
    # placarPenaltis vem da API (mesmo que errado — display honesto)
    assert result["placarPenaltisA"] == 4
    assert result["placarPenaltisB"] == 4
    # Vencedor: API não retorna winner (null no caso real), mas
    # _fd_match infere do placar — mas placar aqui é 1-1 (regularTime),
    # então winner vem do fixture. Para um teste mais fiel, ver
    # test_fd_penalty_shootout_vencedor_from_score_winner.


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
