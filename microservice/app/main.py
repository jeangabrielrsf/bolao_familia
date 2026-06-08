from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import resultados

app = FastAPI(title="Bolão Copa 2026 - Resultados")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resultados.router)
