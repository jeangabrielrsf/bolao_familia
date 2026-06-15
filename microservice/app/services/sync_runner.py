"""Lógica principal do sync de resultados.

Extraída de `routers/resultados.py::sincronizar_resultados` para que tanto
o endpoint HTTP quanto o scheduler interno possam reutilizar a mesma
função. O lock advisory `LOCK_KEY_RESULTADOS_SYNC` impede corrida entre
múltiplas instâncias (GH Actions + APScheduler local).
"""
from __future__ import annotations

import logging
import time
from datetime import timezone
from typing import Any

from app.config import settings
from app.services import db, football_data, sync_writer, worldcup26

logger = logging.getLogger(__name__)


async def run(window_hours: int = 12, origem: str = "auto") -> dict[str, Any]:
    """Sincroniza resultados das APIs externas com o DB.

    Args:
        window_hours: janela de jogos ativos a considerar (padrão 12h).
        origem: rótulo para rastreabilidade (header `X-Origem` ou
            "scheduler" quando disparado internamente).

    Returns:
        Dict com `success`, `skipped`, `atualizados`, `finalizados`,
        `mudancas`, `duracaoMs`.
    """
    t0 = time.monotonic()
    logger.info(
        f"\n=== INÍCIO SYNC RESULTADOS (origem={origem}, window={window_hours}h) ==="
    )

    try:
        async with db.with_db_tx() as conn:
            # 1. Adquire lock advisory (idempotente entre instâncias)
            lock_acquired = await conn.fetchval(
                "SELECT pg_try_advisory_xact_lock($1)",
                settings.LOCK_KEY_RESULTADOS_SYNC,
            )
            if not lock_acquired:
                logger.info("Lock já adquirido por outra instância. Pulando.")
                return {
                    "success": True,
                    "skipped": "sync_already_running",
                    "message": "Outra instância do sync está em execução",
                    "duracaoMs": int((time.monotonic() - t0) * 1000),
                }

            # 2. Busca jogos com sofascore_id dentro da janela
            rows = await conn.fetch(
                """
                SELECT id, grupo, fase, data_hora, time_a, time_b,
                       resultado_a, resultado_b, status, sofascore_id,
                       local, cidade, vencedor,
                       placar_penaltis_a, placar_penaltis_b
                FROM jogos
                WHERE sofascore_id IS NOT NULL
                  AND data_hora >= NOW() - ($1 || ' hours')::interval
                  AND data_hora <= NOW() + INTERVAL '6 hours'
                ORDER BY data_hora
                """,
                str(window_hours),
            )

            if not rows:
                logger.info(f"Nenhum jogo com sofascore_id nas últimas {window_hours}h")
                return {
                    "success": True,
                    "skipped": "no_active_games",
                    "message": f"Nenhum jogo ativo nas últimas {window_hours} horas",
                    "duracaoMs": int((time.monotonic() - t0) * 1000),
                }

            logger.info(f"Processando {len(rows)} jogos...")

            # 3. Busca dados externos (APIs)
            fd_matches = await football_data.get_all_wc_matches()
            wc_matches = await worldcup26.get_all_matches()
            wc_stadiums = await worldcup26.get_stadiums()

            # 4. Monta lista de resultados (mesmo formato de /lote)
            resultados: list[dict[str, Any]] = []
            for jogo in rows:
                dt_naive = jogo["data_hora"]
                dt_aware = dt_naive.replace(tzinfo=timezone.utc)
                data_hora_iso = dt_aware.isoformat().replace("+00:00", "Z")
                grupo = jogo["grupo"] or ""

                fd_result = None
                wc_result = None

                if fd_matches:
                    fd_result = football_data.match_game(
                        fd_matches, grupo, data_hora_iso
                    )
                if wc_matches:
                    wc_result = worldcup26.match_game(
                        wc_matches, grupo, data_hora_iso, wc_stadiums
                    )

                if fd_result is not None:
                    result = fd_result
                    if not result.get("local") and wc_result is not None:
                        result["local"] = wc_result.get("local")
                    if not result.get("cidade") and wc_result is not None:
                        result["cidade"] = wc_result.get("cidade")
                elif wc_result is not None:
                    result = wc_result
                else:
                    result = {
                        "sofascoreId": jogo["sofascore_id"],
                        "resultadoA": 0,
                        "resultadoB": 0,
                        "status": "not_found",
                    }

                result["sofascoreId"] = jogo["sofascore_id"]
                resultados.append(result)

            # 5. Compara e atualiza (idempotente)
            sync_result = await sync_writer.sincronizar_jogos(
                conn, list(rows), resultados
            )

    except Exception as e:
        logger.exception("Erro durante sincronização")
        raise

    duracao_ms = int((time.monotonic() - t0) * 1000)
    sync_result.duracaoMs = duracao_ms
    sync_result.origem = origem

    logger.info(
        f"\n=== FIM SYNC RESULTADOS ===\n"
        f"  Processados:  {len(rows)}\n"
        f"  Atualizados:  {sync_result.atualizados}\n"
        f"  Finalizados:  {sync_result.finalizados}\n"
        f"  Duração:      {duracao_ms}ms"
    )

    return {
        "success": True,
        "skipped": False,
        "origem": origem,
        "duracaoMs": duracao_ms,
        "atualizados": sync_result.atualizados,
        "finalizados": sync_result.finalizados,
        "mudancas": [
            {
                "jogoId": m.jogoId,
                "timeA": m.timeA,
                "timeB": m.timeB,
                "grupo": m.grupo,
                "fase": m.fase,
                "mudouPlacar": m.mudouPlacar,
                "mudouStatus": m.mudouStatus,
                "mudouLocal": m.mudouLocal,
                "mudouCidade": m.mudouCidade,
                "antes": m.antes,
                "depois": m.depois,
            }
            for m in sync_result.mudancas
        ],
    }
