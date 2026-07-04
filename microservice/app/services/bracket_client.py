"""Client HTTP que notifica o Next.js pra atualizar o bracket após sync.

Service-to-service: autentica via X-Cron-Secret (não via cookie admin).
Best-effort: falha de rede não quebra o sync de resultados — loga e segue.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 30


async def notificar_bracket() -> dict[str, Any] | None:
    """Chama `POST /api/admin/bracket/atualizar` no Next.js.

    Retorna JSON da resposta ou None se:
    - NEXTJS_BASE_URL não configurado
    - falha de rede / timeout / HTTP error
    """
    base_url = settings.NEXTJS_BASE_URL.strip()
    if not base_url:
        logger.info("[bracket_client] NEXTJS_BASE_URL vazio — pulando notificação")
        return None

    url = f"{base_url.rstrip('/')}/api/admin/bracket/atualizar"
    headers = {
        "X-Cron-Secret": settings.CRON_SECRET,
        "User-Agent": "bolao-copa-microservice/1.0",
    }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT_SECONDS) as client:
            response = await client.post(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            logger.info(
                f"[bracket_client] bracket atualizado: "
                f"{data.get('atualizados', '?')} slots preenchidos"
            )
            return data
    except httpx.HTTPStatusError as e:
        logger.warning(
            f"[bracket_client] HTTP {e.response.status_code} ao notificar bracket — "
            f"sync de resultados não foi afetado"
        )
        return None
    except httpx.HTTPError as e:
        logger.warning(
            f"[bracket_client] erro de rede ao notificar bracket: {e} — "
            f"sync de resultados não foi afetado"
        )
        return None
    except Exception as e:  # pragma: no cover — fallback defensivo
        logger.exception(f"[bracket_client] erro inesperado: {e}")
        return None
