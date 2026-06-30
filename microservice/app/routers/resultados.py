import logging
from typing import Any, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.services import football_data, sync_runner, teams, worldcup26

logger = logging.getLogger(__name__)

router = APIRouter()


class JogoRequest(BaseModel):
    sofascoreId: str
    timeA: Optional[str] = None
    timeB: Optional[str] = None
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
    from app import scheduler
    from app.config import settings
    from app.main import APP_VERSION

    return {
        "status": "ok",
        "scheduler": "running" if scheduler.is_running() else "stopped",
        "version": APP_VERSION,
        "football_data_key": "set" if settings.FOOTBALL_DATA_API_KEY else "MISSING",
    }


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

        time_a_tla = teams.get_tla(jogo.timeA)
        time_b_tla = teams.get_tla(jogo.timeB)

        if fd_matches:
            fd_result = football_data.match_game(
                fd_matches,
                jogo.grupo,
                jogo.dataHora,
                time_a_tla=time_a_tla,
                time_b_tla=time_b_tla,
            )

        if wc_matches:
            wc_result = worldcup26.match_game(
                wc_matches,
                jogo.grupo,
                jogo.dataHora,
                wc_stadiums,
                time_a_pt=jogo.timeA,
                time_b_pt=jogo.timeB,
            )

        if fd_result is not None:
            result = fd_result
            if not result.get("local") and wc_result is not None:
                result["local"] = wc_result.get("local")
            if not result.get("cidade") and wc_result is not None:
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

    Nota: a lógica foi extraída para `app.services.sync_runner.run()`.
    O scheduler interno (APScheduler) também chama essa mesma função.
    """
    # 1. Autenticação
    if not settings.CRON_SECRET or x_cron_secret != settings.CRON_SECRET:
        logger.warning(f"Auth falhou para sincronizar_resultados (origem={x_origem})")
        raise HTTPException(status_code=401, detail="Unauthorized")

    try:
        return await sync_runner.run(window_hours=x_window_hours, origem=x_origem)
    except Exception as e:
        logger.exception("Erro durante sincronização")
        raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")
