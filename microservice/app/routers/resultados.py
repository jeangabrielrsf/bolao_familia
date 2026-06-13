import logging
import time
from datetime import timezone
from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.services import db, football_data, sync_writer, worldcup26

logger = logging.getLogger(__name__)

router = APIRouter()


class JogoRequest(BaseModel):
    sofascoreId: str
    timeA: str
    timeB: str
    dataHora: str
    grupo: str


class LoteRequestV2(BaseModel):
    jogos: list[JogoRequest]
    force_refresh: bool = False


class ResultadoResponse(BaseModel):
    sofascoreId: str
    resultadoA: int
    resultadoB: int
    status: str
    local: Optional[str] = None
    cidade: Optional[str] = None
    vencedor: Optional[int] = None
    placarPenaltisA: Optional[int] = None
    placarPenaltisB: Optional[int] = None


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/resultados/lote", response_model=list[ResultadoResponse])
async def get_resultados_lote(req: LoteRequestV2) -> list[ResultadoResponse]:
    results: list[ResultadoResponse] = []

    if req.force_refresh:
        from app.services.cache import cache
        cache.delete(football_data.CACHE_KEY_ALL)
        cache.delete(worldcup26.CACHE_KEY_ALL)
        cache.delete(worldcup26.CACHE_KEY_STADIUMS)

    fd_matches = await football_data.get_all_wc_matches()
    wc_matches = await worldcup26.get_all_matches()
    wc_stadiums = await worldcup26.get_stadiums()

    for jogo in req.jogos:
        fd_result = None
        wc_result = None

        if fd_matches:
            fd_result = football_data.match_game(fd_matches, jogo.grupo, jogo.dataHora)

        if wc_matches:
            wc_result = worldcup26.match_game(wc_matches, jogo.grupo, jogo.dataHora, wc_stadiums)

        if fd_result is not None:
            result = fd_result
            if result.get("local") is None and wc_result is not None:
                result["local"] = wc_result.get("local")
            if result.get("cidade") is None and wc_result is not None:
                result["cidade"] = wc_result.get("cidade")
            results.append(ResultadoResponse(sofascoreId=jogo.sofascoreId, **result))
        elif wc_result is not None:
            results.append(ResultadoResponse(sofascoreId=jogo.sofascoreId, **wc_result))
        else:
            results.append(
                ResultadoResponse(
                    sofascoreId=jogo.sofascoreId,
                    resultadoA=0,
                    resultadoB=0,
                    status="not_found",
                )
            )

    return results


@router.post("/resultados/sincronizar")
async def sincronizar_resultados(
    x_cron_secret: str | None = Header(default=None, alias="X-Cron-Secret"),
    x_origem: str = Header(default="unknown", alias="X-Origem"),
    x_window_hours: int = Header(default=12, alias="X-Window-Hours"),
) -> dict[str, Any]:
    """Sincroniza resultados do DB com APIs externas (football-data.org +
    worldcup26.ir). Idempotente: roda 2x = mesmo resultado.

    Autenticação: header `X-Cron-Secret` deve bater com `CRON_SECRET` no env.
    Janela: jogos com `data_hora` nas últimas `X-Window-Hours` (default 12h).
    """
    t0 = time.monotonic()

    # 1. Autenticação
    if not settings.CRON_SECRET or x_cron_secret != settings.CRON_SECRET:
        logger.warning(f"Auth falhou para sincronizar_resultados (origem={x_origem})")
        raise HTTPException(status_code=401, detail="Unauthorized")

    logger.info(
        f"\n=== INÍCIO SYNC RESULTADOS (origem={x_origem}, window={x_window_hours}h) ==="
    )

    # 2. Buscar jogos ativos (dentro da janela)
    try:
        async with db.with_db_tx() as conn:
            # 2a. Tenta adquirir advisory lock
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

            # 2b. Buscar jogos com sofascore_id dentro da janela
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
                str(x_window_hours),
            )

            if not rows:
                logger.info(f"Nenhum jogo com sofascore_id nas últimas {x_window_hours}h")
                return {
                    "success": True,
                    "skipped": "no_active_games",
                    "message": f"Nenhum jogo ativo nas últimas {x_window_hours} horas",
                    "duracaoMs": int((time.monotonic() - t0) * 1000),
                }

            logger.info(f"Processando {len(rows)} jogos...")

            # 3. Buscar dados externos
            fd_matches = await football_data.get_all_wc_matches()
            wc_matches = await worldcup26.get_all_matches()
            wc_stadiums = await worldcup26.get_stadiums()

            # 4. Montar lista de resultados (mesmo formato de /resultados/lote)
            resultados: list[dict[str, Any]] = []
            for jogo in rows:
                # DB armazena data_hora como naive (UTC por convenção do projeto).
                # Precisamos passar como offset-aware (com Z) para matchar
                # _dates_match() que compara com datetimes offset-aware das APIs.
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
                    if result.get("local") is None and wc_result is not None:
                        result["local"] = wc_result.get("local")
                    if result.get("cidade") is None and wc_result is not None:
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

            # 5. Comparar e atualizar (idempotente)
            sync_result = await sync_writer.sincronizar_jogos(conn, list(rows), resultados)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro durante sincronização")
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")

    duracao_ms = int((time.monotonic() - t0) * 1000)
    sync_result.duracaoMs = duracao_ms
    sync_result.origem = x_origem

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
        "origem": x_origem,
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
