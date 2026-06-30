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
from app.services import db, football_data, sync_writer, teams, worldcup26

logger = logging.getLogger(__name__)


def combinar_resultados(
    fd_result: dict[str, Any] | None,
    wc_result: dict[str, Any] | None,
) -> dict[str, Any]:
    """Combina resultados das APIs football_data e worldcup26 em um único dict.

    Estratégia de merge:
    - `resultadoA/B` (placar pré-pênaltis) → vem do football_data (primário)
    - `placarPenaltisA/B` → worldcup26 se disponível (mais preciso), senão fd
    - `vencedor` → chain de fallback: placar decide; empate → worldcup26 pen;
      empate → football_data score.winner; sem dados → None
    - `local`/`cidade` → football_data com fallback worldcup26

    Args:
        fd_result: dict de football_data.match_game, ou None
        wc_result: dict de worldcup26.match_game, ou None

    Returns:
        Dict no formato esperado por sync_writer (com placar, status, vencedor, etc.)
        Se ambos são None, retorna dict de "not_found".
    """
    if fd_result is None and wc_result is None:
        return {
            "resultadoA": 0,
            "resultadoB": 0,
            "status": "not_found",
        }

    if fd_result is None:
        # Só worldcup26 retornou dados. Vencedor = chain de fallback.
        vencedor = _resolver_vencedor(
            resultado_a=wc_result["resultadoA"],
            resultado_b=wc_result["resultadoB"],
            wc_pen_a=wc_result.get("placarPenaltisA"),
            wc_pen_b=wc_result.get("placarPenaltisB"),
            fd_winner=None,
            status=wc_result["status"],
        )
        wc_result = dict(wc_result)
        wc_result["vencedor"] = vencedor
        return wc_result

    if wc_result is None:
        # Só football_data retornou dados. Sem worldcup26 penalties.
        vencedor = _resolver_vencedor(
            resultado_a=fd_result["resultadoA"],
            resultado_b=fd_result["resultadoB"],
            wc_pen_a=None,
            wc_pen_b=None,
            fd_winner=fd_result.get("_fd_score_winner"),
            status=fd_result["status"],
        )
        fd_result = dict(fd_result)
        fd_result["vencedor"] = vencedor
        return fd_result

    # Ambos retornaram. Merge.
    fd = dict(fd_result)
    fd["cidade"] = fd.get("cidade") or wc_result.get("cidade")
    fd["local"] = fd.get("local") or wc_result.get("local")
    # placar_penaltis: worldcup26 é mais preciso (football-data tem bugs).
    wc_pen_a = wc_result.get("placarPenaltisA")
    wc_pen_b = wc_result.get("placarPenaltisB")
    if wc_pen_a is not None and wc_pen_b is not None:
        fd["placarPenaltisA"] = wc_pen_a
        fd["placarPenaltisB"] = wc_pen_b
    # vencedor: chain de fallback
    fd["vencedor"] = _resolver_vencedor(
        resultado_a=fd["resultadoA"],
        resultado_b=fd["resultadoB"],
        wc_pen_a=wc_pen_a,
        wc_pen_b=wc_pen_b,
        fd_winner=fd.get("_fd_score_winner"),
        status=fd["status"],
    )
    return fd


def _resolver_vencedor(
    *,
    resultado_a: int,
    resultado_b: int,
    wc_pen_a: int | None,
    wc_pen_b: int | None,
    fd_winner: str | None,
    status: str,
) -> int | None:
    """Decide vencedor (1=home, 2=away, 3=draw) com chain de fallback.

    Ordem de prioridade:
    1. Se placar não-empatado → placar decide (1 ou 2)
    2. Se placar empatado e worldcup26 tem penalties → pen decide (1 ou 2)
    3. Se football_data score.winner disponível → usa (HOME_TEAM=1, AWAY_TEAM=2)
    4. Sem dados → None (admin seta manual)
    """
    if status != "finished":
        return None

    if resultado_a != resultado_b:
        return 1 if resultado_a > resultado_b else 2

    if wc_pen_a is not None and wc_pen_b is not None and wc_pen_a != wc_pen_b:
        return 1 if wc_pen_a > wc_pen_b else 2

    if fd_winner == "HOME_TEAM":
        return 1
    if fd_winner == "AWAY_TEAM":
        return 2
    if fd_winner == "DRAW":
        return 3

    return None


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
                time_a_pt = jogo["time_a"]
                time_b_pt = jogo["time_b"]
                time_a_tla = teams.get_tla(time_a_pt)
                time_b_tla = teams.get_tla(time_b_pt)

                fd_result = None
                wc_result = None

                if fd_matches:
                    fd_result = football_data.match_game(
                        fd_matches,
                        grupo,
                        data_hora_iso,
                        time_a_tla=time_a_tla,
                        time_b_tla=time_b_tla,
                    )
                if wc_matches:
                    wc_result = worldcup26.match_game(
                        wc_matches,
                        grupo,
                        data_hora_iso,
                        wc_stadiums,
                        time_a_pt=time_a_pt,
                        time_b_pt=time_b_pt,
                    )

                if fd_result is not None:
                    fd_result["cidade"] = fd_result.get("cidade") or None
                result = combinar_resultados(fd_result, wc_result)
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
