import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import scheduler
from app.routers import resultados

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(title="Bolão Copa 2026 - Resultados")

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
