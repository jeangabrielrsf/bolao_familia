import logging

from fastapi import APIRouter
from pydantic import BaseModel

from app.services import sofascore, football_data

logger = logging.getLogger(__name__)

router = APIRouter()


class LoteRequest(BaseModel):
    sofascore_ids: list[str]
    force_refresh: bool = False


class ResultadoResponse(BaseModel):
    sofascoreId: str
    resultadoA: int
    resultadoB: int
    status: str


@router.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/resultados/{sofascore_id}", response_model=ResultadoResponse)
async def get_resultado(sofascore_id: str) -> ResultadoResponse:
    result = await sofascore.get_event_result(sofascore_id)
    if result is None:
        result = await football_data.get_match_result(sofascore_id)
    if result is None:
        return ResultadoResponse(
            sofascoreId=sofascore_id,
            resultadoA=0,
            resultadoB=0,
            status="not_found",
        )
    return ResultadoResponse(sofascoreId=sofascore_id, **result)


@router.post("/resultados/lote", response_model=list[ResultadoResponse])
async def get_resultados_lote(req: LoteRequest) -> list[ResultadoResponse]:
    results: list[ResultadoResponse] = []

    if req.force_refresh:
        sofascore_results = await sofascore.get_all_results_no_cache(req.sofascore_ids)
    else:
        sofascore_results = await sofascore.get_all_results(req.sofascore_ids)

    found_ids = {r["sofascoreId"] for r in sofascore_results}

    for r in sofascore_results:
        results.append(ResultadoResponse(**r))

    missing_ids = [sid for sid in req.sofascore_ids if sid not in found_ids]
    for mid in missing_ids:
        fd_result = await football_data.get_match_result(mid)
        if fd_result is not None:
            results.append(ResultadoResponse(sofascoreId=mid, **fd_result))
        else:
            results.append(
                ResultadoResponse(
                    sofascoreId=mid,
                    resultadoA=0,
                    resultadoB=0,
                    status="not_found",
                )
            )

    return results
