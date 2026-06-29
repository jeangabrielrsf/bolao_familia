import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import scheduler
from app.routers import resultados

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)

# Versão do código para detectar drift entre local e prod.
# Bump quando há mudanças em sync (este valor aparece no log de startup
# e em /health). Útil para confirmar se o deploy mais recente está rodando.
APP_VERSION = os.environ.get("APP_VERSION", "dev-local")
GIT_SHA = os.environ.get("GIT_SHA", "unknown")

logger.info("=" * 60)
logger.info("Bolão Copa 2026 - Microserviço de Resultados")
logger.info(f"  versão:    {APP_VERSION}")
logger.info(f"  git_sha:   {GIT_SHA}")
logger.info(f"  python:    {os.sys.version.split()[0]}")
fd_key = os.environ.get("FOOTBALL_DATA_API_KEY", "")
logger.info(f"  fd_key:    {'SET (' + str(len(fd_key)) + ' chars)' if fd_key else '!!! NOT SET !!!'}")
logger.info("=" * 60)

app = FastAPI(
    title="Bolão Copa 2026 - Resultados",
    version=APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resultados.router)


@app.on_event("startup")
async def _on_startup() -> None:
    scheduler.start()


@app.on_event("shutdown")
async def _on_shutdown() -> None:
    scheduler.shutdown()
