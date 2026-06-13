"""Conexão Postgres via asyncpg + helpers de transação.

Pool singleton lazy-inicializado. Transações devem usar `with_db_tx()` para
garantir release e integração com advisory lock.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

import asyncpg

from app.config import settings

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    """Retorna o pool, criando na primeira chamada."""
    global _pool
    if _pool is None:
        if not settings.DATABASE_URL:
            raise RuntimeError(
                "DATABASE_URL não configurada. Defina no .env ou variável de ambiente."
            )
        logger.info("Criando pool asyncpg...")
        _pool = await asyncpg.create_pool(
            dsn=settings.DATABASE_URL,
            min_size=1,
            max_size=5,
            command_timeout=30,
        )
        logger.info("Pool criado.")
    return _pool


async def close_pool() -> None:
    """Fecha o pool (chamar no shutdown da app)."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("Pool fechado.")


@asynccontextmanager
async def with_db_tx() -> AsyncIterator[asyncpg.Connection]:
    """Context manager: adquire conexão e abre transação.

    Uso:
        async with with_db_tx() as conn:
            await conn.execute(...)
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            yield conn
