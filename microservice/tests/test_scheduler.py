"""Testes do scheduler.

Valida que:
- _job é uma coroutine function (compatível com AsyncIOScheduler)
- _job respeita a janela ativa UTC
- start()/shutdown() podem ser chamados sem erro
- is_running() reflete o estado do scheduler
"""
from __future__ import annotations

import asyncio
import inspect
from unittest.mock import patch

import pytest

from app import scheduler


def test_job_is_coroutine_function() -> None:
    """_job precisa ser async def para o AsyncIOScheduler rodar no mesmo event loop.

    Se for def regular + asyncio.run() dentro, o asyncpg pool (criado no
    event loop do FastAPI startup) quebra com 'Event loop is closed' quando
    o job roda no novo loop criado por asyncio.run().
    """
    assert inspect.iscoroutinefunction(scheduler._job), (
        "_job deve ser async def para rodar no mesmo event loop do asyncpg pool"
    )


def test_job_skipped_outside_active_window() -> None:
    """Fora da janela ativa, _job não chama sync_runner.run()."""
    # Janela inativa: 8h UTC (entre 5-15 UTC)
    with patch.object(scheduler, "_is_in_active_window", return_value=False), \
         patch.object(scheduler, "sync_runner") as mock_runner:
        asyncio.run(scheduler._job())
        mock_runner.run.assert_not_called()


def test_active_window_includes_diurno_and_noturno() -> None:
    """Janela ativa cobre 0-4 e 16-23 UTC. Defesa-em-profundidade."""
    from datetime import datetime, timezone

    for hour in [0, 1, 2, 3, 4, 16, 17, 18, 19, 20, 21, 22, 23]:
        with patch.object(scheduler, "datetime") as mock_dt:
            mock_dt.now.return_value.hour = hour
            assert scheduler._is_in_active_window() is True, (
                f"Hora {hour} UTC deveria estar dentro da janela ativa"
            )

    for hour in [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]:
        with patch.object(scheduler, "datetime") as mock_dt:
            mock_dt.now.return_value.hour = hour
            assert scheduler._is_in_active_window() is False, (
                f"Hora {hour} UTC deveria estar fora da janela ativa"
            )


def test_is_running_false_when_not_started() -> None:
    """Antes de start(), is_running() retorna False."""
    # Garante estado limpo
    scheduler.shutdown()
    assert scheduler.is_running() is False
