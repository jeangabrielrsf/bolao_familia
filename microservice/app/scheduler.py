"""Scheduler interno (APScheduler) que dispara sync a cada 15min com janela dinâmica.

Substitui a dependência do GitHub Actions cron, que sofre throttling
(~82% dos runs agendados são descartados pela plataforma GH).

Janela dinâmica: só roda sync se houver jogo pendente (não finalizado)
nas próximas 30min ou em andamento. Economiza requests da Highlightly
e evita processamento desnecessário.

O lock advisory `LOCK_KEY_RESULTADOS_SYNC` no `sync_runner.run()`
garante que o scheduler interno e o endpoint HTTP (acionado por GH
Actions ou manualmente) nunca rodem em paralelo.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.services import db, sync_runner

logger = logging.getLogger(__name__)

CRON_EXPR = "*/15 * * * *"  # a cada 15min, o tempo todo
WINDOW_HOURS = 12

_scheduler: AsyncIOScheduler | None = None


async def _has_upcoming_games() -> bool:
    """Verifica se há jogo pendente nas próximas 30min ou em andamento.

    Query dinâmica: busca o próximo jogo não finalizado e verifica se
    ele começa em ≤30min. Se sim, roda sync. Se não, pula.
    """
    try:
        async with db.with_db_tx() as conn:
            row = await conn.fetchrow(
                """
                SELECT data_hora, status FROM jogos
                WHERE status != 'finalizado'
                ORDER BY data_hora ASC
                LIMIT 1
                """
            )
            if not row:
                logger.debug("Nenhum jogo pendente. Pulando sync.")
                return False

            data_hora = row["data_hora"]
            status = row["status"]

            if status == "em_andamento":
                logger.debug(f"Jogo em andamento ({data_hora}). Rodando sync.")
                return True

            agora = datetime.now(timezone.utc)
            data_hora_utc = data_hora.replace(tzinfo=timezone.utc) if data_hora.tzinfo is None else data_hora
            diff_minutos = (data_hora_utc - agora).total_seconds() / 60

            if diff_minutos <= 30:
                logger.debug(f"Próximo jogo em {diff_minutos:.0f}min. Rodando sync.")
                return True

            logger.debug(f"Próximo jogo em {diff_minutos:.0f}min (>30min). Pulando sync.")
            return False
    except Exception:
        logger.exception("Erro verificando jogos pendentes. Rodando sync por segurança.")
        return True


async def _job() -> None:
    """Callback do cron. Roda sync_runner.run() se houver jogo pendente.

    AsyncIOScheduler roda esta coroutine no MESMO event loop do FastAPI,
    então o asyncpg pool (criado no startup) funciona corretamente.
    Se fosse def regular + asyncio.run() dentro, criaria um novo loop
    e o pool quebraria com 'Event loop is closed'.
    """
    if not await _has_upcoming_games():
        return
    try:
        result = await sync_runner.run(window_hours=WINDOW_HOURS, origem="scheduler")
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

    _scheduler = AsyncIOScheduler(timezone="UTC")
    _scheduler.add_job(
        _job,
        CronTrigger.from_crontab(CRON_EXPR, timezone="UTC"),
        id="sync_jogos",
        max_instances=1,
        coalesce=True,
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(f"Scheduler iniciado: jobs em '{CRON_EXPR}' (UTC) com janela dinâmica")


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
