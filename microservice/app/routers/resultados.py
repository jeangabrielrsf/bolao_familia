import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.services import football_data, worldcup26

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
