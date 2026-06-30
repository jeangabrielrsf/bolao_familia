"""Testes do merger `combinar_resultados` em sync_runner.

O merger é o que junta os resultados das duas APIs (football_data +
worldcup26) e decide:
- placar pré-pênaltis (já vem pronto do football_data, que usa
  regularTime + extraTime)
- placar_penaltis (worldcup26 é fonte autoritativa; football-data tem
  dados errados em alguns jogos)
- vencedor (chain de fallback: placar > worldcup26 pen > fd.winner > None)

Cenário crítico: GER×PAR (sofascore 537415). football-data retorna
penalties=4-4 (errado) e winner=null. worldcup26 retorna penalties=3-4
(certo) e home_score=1, away_score=1. O merger tem que usar o pen do
worldcup26 para decidir que Paraguai passou.
"""
from __future__ import annotations

from typing import Any

import pytest

from app.services.sync_runner import combinar_resultados


def _fd(
    *,
    resultado_a: int,
    resultado_b: int,
    placar_pen_a: int | None = None,
    placar_pen_b: int | None = None,
    fd_winner: str | None = None,
    cidade: str | None = None,
    local: str | None = None,
    status: str = "finished",
) -> dict[str, Any]:
    """Mínimo de football_data.match_game pro merger."""
    resultado: dict[str, Any] = {
        "resultadoA": resultado_a,
        "resultadoB": resultado_b,
        "status": status,
        "local": local,
        "cidade": cidade,
        "vencedor": None,
        "placarPenaltisA": placar_pen_a,
        "placarPenaltisB": placar_pen_b,
        "_fd_score_winner": fd_winner,
    }
    return resultado


def _wc(
    *,
    resultado_a: int,
    resultado_b: int,
    placar_pen_a: int | None = None,
    placar_pen_b: int | None = None,
    cidade: str | None = None,
    local: str | None = None,
    status: str = "finished",
) -> dict[str, Any]:
    """Mínimo de worldcup26.match_game pro merger."""
    return {
        "resultadoA": resultado_a,
        "resultadoB": resultado_b,
        "status": status,
        "local": local,
        "cidade": cidade,
        "vencedor": None,
        "placarPenaltisA": placar_pen_a,
        "placarPenaltisB": placar_pen_b,
    }


class TestCombinarResultadosVencedor:
    """Chain de fallback do vencedor: placar > wc_pen > fd_winner > None."""

    def test_placar_decide_quando_nao_empatado(self) -> None:
        """Home 2-1: vencedor pelo placar (não precisa de penalties)."""
        result = combinar_resultados(
            _fd(resultado_a=2, resultado_b=1),
            _wc(resultado_a=2, resultado_b=1),
        )
        assert result["vencedor"] == 1

    def test_placar_empatado_wc_pen_decide(self) -> None:
        """Caso GER×PAR: placar 1-1, wc_pen 3-4 → Paraguai (2) passou."""
        result = combinar_resultados(
            _fd(
                resultado_a=1, resultado_b=1,
                placar_pen_a=4, placar_pen_b=4,  # fd dados errados
                fd_winner=None,
            ),
            _wc(
                resultado_a=1, resultado_b=1,
                placar_pen_a=3, placar_pen_b=4,  # wc correto
            ),
        )
        assert result["vencedor"] == 2, "Paraguai passou (wc_pen 3-4)"

    def test_placar_empatado_wc_pen_empatado_fd_winner_decide(self) -> None:
        """Caso degenerado: placar 1-1, wc_pen 4-4 (também empatado).
        Cai pra fd_winner como último fallback."""
        result = combinar_resultados(
            _fd(
                resultado_a=1, resultado_b=1,
                placar_pen_a=4, placar_pen_b=4,
                fd_winner="AWAY_TEAM",
            ),
            _wc(
                resultado_a=1, resultado_b=1,
                placar_pen_a=4, placar_pen_b=4,
            ),
        )
        assert result["vencedor"] == 2, "fd_winner AWAY_TEAM → 2"

    def test_placar_empatado_wc_pen_indisponivel_fd_winner_home(self) -> None:
        """Sem wc_pen (worldcup26 falhou), só fd_winner decide."""
        result = combinar_resultados(
            _fd(
                resultado_a=1, resultado_b=1,
                placar_pen_a=4, placar_pen_b=4,
                fd_winner="HOME_TEAM",
            ),
            _wc(resultado_a=1, resultado_b=1),  # wc sem pen
        )
        assert result["vencedor"] == 1

    def test_placar_empatado_sem_wc_pen_sem_fd_winner_retorna_none(self) -> None:
        """Sem dados suficientes: admin tem que setar vencedor manual."""
        result = combinar_resultados(
            _fd(
                resultado_a=1, resultado_b=1,
                placar_pen_a=4, placar_pen_b=4,
                fd_winner=None,  # API não tem winner
            ),
            _wc(resultado_a=1, resultado_b=1),  # wc sem pen
        )
        assert result["vencedor"] is None

    def test_status_nao_finalizado_vencedor_none(self) -> None:
        """Jogo em andamento: vencedor sempre None."""
        result = combinar_resultados(
            _fd(resultado_a=1, resultado_b=1, status="inprogress"),
            _wc(resultado_a=1, resultado_b=1),
        )
        assert result["vencedor"] is None


class TestCombinarResultadosPlacarPenaltis:
    """placar_penaltis: worldcup26 é fonte autoritativa."""

    def test_wc_pen_substitui_fd_pen(self) -> None:
        """Caso GER×PAR: wc tem 3-4 (certo), fd tem 4-4 (errado).
        Resultado final deve usar wc."""
        result = combinar_resultados(
            _fd(
                resultado_a=1, resultado_b=1,
                placar_pen_a=4, placar_pen_b=4,
            ),
            _wc(
                resultado_a=1, resultado_b=1,
                placar_pen_a=3, placar_pen_b=4,
            ),
        )
        assert result["placarPenaltisA"] == 3
        assert result["placarPenaltisB"] == 4

    def test_fd_pen_usado_quando_wc_indisponivel(self) -> None:
        """Sem wc_pen, fallback pro fd (mesmo que potencialmente errado)."""
        result = combinar_resultados(
            _fd(
                resultado_a=1, resultado_b=1,
                placar_pen_a=4, placar_pen_b=4,
            ),
            _wc(resultado_a=1, resultado_b=1),  # sem pen
        )
        assert result["placarPenaltisA"] == 4
        assert result["placarPenaltisB"] == 4

    def test_sem_penalties_em_nehuma_api(self) -> None:
        """Jogo sem pen (grupo ou mata-mata ganho no ET)."""
        result = combinar_resultados(
            _fd(resultado_a=2, resultado_b=1),
            _wc(resultado_a=2, resultado_b=1),
        )
        assert result["placarPenaltisA"] is None
        assert result["placarPenaltisB"] is None


class TestCombinarResultadosLocalCidade:
    """local/cidade: fd com fallback wc."""

    def test_fd_local_cidade_usado_direto(self) -> None:
        result = combinar_resultados(
            _fd(resultado_a=1, resultado_b=1, local="Venue X", cidade="Cidade Y"),
            _wc(resultado_a=1, resultado_b=1),
        )
        assert result["local"] == "Venue X"
        assert result["cidade"] == "Cidade Y"

    def test_wc_complementa_quando_fd_vazio(self) -> None:
        """football-data às vezes não retorna local/cidade — usa wc como fallback."""
        result = combinar_resultados(
            _fd(resultado_a=1, resultado_b=1, local=None, cidade=None),
            _wc(resultado_a=1, resultado_b=1, local="WC Venue", cidade="WC City"),
        )
        assert result["local"] == "WC Venue"
        assert result["cidade"] == "WC City"

    def test_apenas_fd_disponivel(self) -> None:
        """Sem worldcup26, usa o que fd tem (mesmo com campos vazios)."""
        result = combinar_resultados(
            _fd(resultado_a=1, resultado_b=1, local="Venue X", cidade=None),
            None,
        )
        assert result["local"] == "Venue X"

    def test_apenas_wc_disponivel(self) -> None:
        """Sem football_data, usa o que wc tem."""
        result = combinar_resultados(
            None,
            _wc(resultado_a=1, resultado_b=1, local="WC Venue", cidade="WC City"),
        )
        assert result["local"] == "WC Venue"
        assert result["cidade"] == "WC City"


class TestCombinarResultadosAusenciaTotal:
    """Sem dados de nenhuma API: retorna not_found."""

    def test_ambos_none(self) -> None:
        result = combinar_resultados(None, None)
        assert result["status"] == "not_found"
        assert result["resultadoA"] == 0
        assert result["resultadoB"] == 0
