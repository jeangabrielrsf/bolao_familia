"""Scheduler interno (APScheduler) que dispara sync a cada 15min em janelas ativas.

Substitui a dependência do GitHub Actions cron, que sofre throttling
(~82% dos runs agendados são descartados pela plataforma GH).

Janelas ativas (UTC):
- 16-23 (BRT 13-20) — jogos diurnos
- 0-4   (BRT 21-01) — jogos noturnos

O lock advisory `LOCK_KEY_RESULTADOS_SYNC` no `sync_runner.run()`
garante que o scheduler interno e o endpoint HTTP (acionado por GH
Actions ou manualmente) nunca rodem em paralelo.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.services import sync_runner

logger = logging.getLogger(__name__)

# Hora UTC. Sync roda nos minutos 0,15,30,45 dessas horas.
# 16-23 UTC = BRT 13-20 (jogos diurnos)
# 0-4 UTC   = BRT 21-01 (jogos noturnos)
CRON_EXPR_DIURNO = "*/15 16-23 * * *"
CRON_EXPR_NOTURNO = "*/15 0-4 * * *"
WINDOW_HOURS = 12

_scheduler: BackgroundScheduler | None = None


def _is_in_active_window() -> bool:
    """Guard: só roda sync se hora UTC atual está em janela ativa.

    Janelas: 0-4 ou 16-23 UTC. Defesa-em-profundidade caso o cron do
    APScheduler falhe (ex.: restart no meio da expressão).
    """
    hour_utc = datetime.now(timezone.utc).hour
    return hour_utc <= 4 or 16 <= hour_utc <= 23


def _job() -> None:
    """Callback do cron. Roda sync_runner.run() se estiver em janela ativa."""
    if not _is_in_active_window():
        logger.debug("Fora de janela ativa (UTC). Pulando job.")
        return
    try:
        import asyncio
        result = asyncio.run(sync_runner.run(window_hours=WINDOW_HOURS, origem="scheduler"))
        logger.info(
            f"[scheduler] sync ok: atualizados={result.get('atualizados')} "
            f"finalizados={result.get('finalizados')} skipped={result.get('skipped')}"
        )
    except Exception:
        logger.exception("[scheduler] sync falhou")


def start() -> None:
    """Inicia o scheduler (chamado no startup do FastAPI)."""
    global _scheduler
    if _scheduler is not None:
        logger.warning("Scheduler já estava rodando. Ignorando start() duplicado.")
        return

    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        _job,
        CronTrigger.from_crontab(CRON_EXPR_DIURNO, timezone="UTC"),
        id="sync_diurno",
        max_instances=1,
        coalesce=True,
        replace_existing=True,
    )
    _scheduler.add_job(
        _job,
        CronTrigger.from_crontab(CRON_EXPR_NOTURNO, timezone="UTC"),
        id="sync_noturno",
        max_instances=1,
        coalesce=True,
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(
        f"Scheduler iniciado: jobs em '{CRON_EXPR_DIURNO}' e '{CRON_EXPR_NOTURNO}' (UTC)"
    )


def shutdown() -> None:
    """Para o scheduler (chamado no shutdown do FastAPI)."""
    global _scheduler
    if _scheduler is None:
        return
    _scheduler.shutdown(wait=False)
    _scheduler = None
    logger.info("Scheduler parado")


def is_running() -> bool:
    """Útil para health check."""
    return _scheduler is not None and _scheduler.running
