from fastapi import FastAPI
from app.routers import resultados

app = FastAPI(title="Bolão Copa 2026 - Resultados")
app.include_router(resultados.router)
