"""Testes para detecção de inconsistência em dados de pênaltis."""
import pytest
from app.services.sync_runner import _fd_penalty_data_inconsistent, _is_eliminatoria


def test_is_eliminatoria():
    """Testa identificação de fases eliminatórias."""
    assert _is_eliminatoria("oitavas") is True
    assert _is_eliminatoria("quartas") is True
    assert _is_eliminatoria("semifinal") is True
    assert _is_eliminatoria("terceiro") is True
    assert _is_eliminatoria("final") is True
    assert _is_eliminatoria("grupos") is False
    assert _is_eliminatoria("") is False


def test_fd_penalty_data_inconsistent_penalties_tied():
    """Pênaltis empatados em jogo de mata-mata finalizado = inconsistente."""
    result = {
        "status": "finished",
        "placarPenaltisA": 3,
        "placarPenaltisB": 3,
        "vencedor": None,
    }
    assert _fd_penalty_data_inconsistent(result, "oitavas") is True


def test_fd_penalty_data_inconsistent_winner_null():
    """Vencedor null com pênaltis em mata-mata = inconsistente."""
    result = {
        "status": "finished",
        "placarPenaltisA": 4,
        "placarPenaltisB": 3,
        "vencedor": None,
    }
    assert _fd_penalty_data_inconsistent(result, "quartas") is True


def test_fd_penalty_data_inconsistent_winner_draw():
    """Vencedor = empate (3) com pênaltis em mata-mata = inconsistente."""
    result = {
        "status": "finished",
        "placarPenaltisA": 4,
        "placarPenaltisB": 3,
        "vencedor": 3,
    }
    assert _fd_penalty_data_inconsistent(result, "semifinal") is True


def test_fd_penalty_data_consistent_normal():
    """Dados normais não são inconsistentes."""
    result = {
        "status": "finished",
        "placarPenaltisA": 4,
        "placarPenaltisB": 3,
        "vencedor": 1,
    }
    assert _fd_penalty_data_inconsistent(result, "oitavas") is False


def test_fd_penalty_data_not_eliminatoria():
    """Fase de grupos nunca é considerada inconsistente."""
    result = {
        "status": "finished",
        "placarPenaltisA": 3,
        "placarPenaltisB": 3,
        "vencedor": None,
    }
    assert _fd_penalty_data_inconsistent(result, "grupos") is False


def test_fd_penalty_data_not_finished():
    """Jogo não finalizado não é considerado inconsistente."""
    result = {
        "status": "em_andamento",
        "placarPenaltisA": 3,
        "placarPenaltisB": 3,
        "vencedor": None,
    }
    assert _fd_penalty_data_inconsistent(result, "oitavas") is False


def test_fd_penalty_data_no_penalties():
    """Sem dados de pênaltis não é inconsistente."""
    result = {
        "status": "finished",
        "placarPenaltisA": None,
        "placarPenaltisB": None,
        "vencedor": 1,
    }
    assert _fd_penalty_data_inconsistent(result, "oitavas") is False
