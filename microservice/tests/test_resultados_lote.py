"""Testes do endpoint POST /resultados/lote.

Valida o contrato de aceitação de payloads do admin:
- timeA/timeB podem ser null (mata-mata sem times projetados)
- timeA/timeB podem ser strings (jogos de grupo)
- Payload válido retorna 200 com lista de ResultadoResponse
"""
from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app


def _fd_finished_match(
    *, fd_id: int, utc_date: str, home_tla: str, away_tla: str, home: int, away: int
) -> dict[str, Any]:
    return {
        "id": fd_id,
        "utcDate": utc_date,
        "status": "FINISHED",
        "group": None,
        "homeTeam": {"tla": home_tla},
        "awayTeam": {"tla": away_tla},
        "score": {
            "fullTime": {"home": home, "away": away},
            "winner": "HOME_TEAM" if home > away else "AWAY_TEAM" if away > home else "DRAW",
        },
    }


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def test_lote_aceita_time_null_mata_mata(client: TestClient) -> None:
    """Mata-mata sem times projetados (timeA/timeB null) deve passar Pydantic
    e retornar 200 com not_found (não 422).

    Cenário: admin quer consultar placar de R32-M1 antes dos times serem
    definidos pelo bracket. Hoje o cliente (commit 118238e) envia null mas
    o Pydantic model rejeita com 422.
    """
    fd_matches: list[dict[str, Any]] = []
    wc_matches: list[dict[str, Any]] = []

    with patch("app.routers.resultados.football_data") as mock_fd, \
         patch("app.routers.resultados.worldcup26") as mock_wc:
        mock_fd.get_all_wc_matches = AsyncMock(return_value=fd_matches)
        mock_fd.CACHE_KEY_ALL = "fd:wc"
        mock_fd.match_game = MagicMock(return_value=None)
        mock_wc.get_all_matches = AsyncMock(return_value=wc_matches)
        mock_wc.get_stadiums = AsyncMock(return_value={})
        mock_wc.CACHE_KEY_ALL = "wc:matches"
        mock_wc.CACHE_KEY_STADIUMS = "wc:stadiums"

        response = client.post(
            "/resultados/lote",
            json={
                "jogos": [
                    {
                        "sofascoreId": "537417",
                        "timeA": None,
                        "timeB": None,
                        "dataHora": "2026-06-28T19:00:00.000Z",
                        "grupo": "dezesseis_avos",
                    }
                ],
                "force_refresh": False,
            },
        )

    assert response.status_code == 200, response.text
    body = response.json()
    assert isinstance(body, list)
    assert len(body) == 1
    assert body[0]["sofascoreId"] == "537417"
    assert body[0]["status"] == "not_found"


def test_lote_aceita_time_preenchido_grupo(client: TestClient) -> None:
    """Jogo de grupo com times definidos: deve passar e retornar 200."""
    fd_matches = [_fd_finished_match(
        fd_id=12345, utc_date="2026-06-13T22:00:00Z",
        home_tla="BRA", away_tla="MAR", home=3, away=1,
    )]

    with patch("app.routers.resultados.football_data") as mock_fd, \
         patch("app.routers.resultados.worldcup26") as mock_wc:
        mock_fd.get_all_wc_matches = AsyncMock(return_value=fd_matches)
        mock_fd.CACHE_KEY_ALL = "fd:wc"
        mock_fd.match_game = MagicMock(return_value={
            "resultadoA": 3,
            "resultadoB": 1,
            "status": "finished",
            "local": "East Rutherford",
            "vencedor": 1,
        })
        mock_wc.get_all_matches = AsyncMock(return_value=[])
        mock_wc.get_stadiums = AsyncMock(return_value={})
        mock_wc.CACHE_KEY_ALL = "wc:matches"
        mock_wc.CACHE_KEY_STADIUMS = "wc:stadiums"

        response = client.post(
            "/resultados/lote",
            json={
                "jogos": [
                    {
                        "sofascoreId": "12345",
                        "timeA": "Brasil",
                        "timeB": "Marrocos",
                        "dataHora": "2026-06-13T22:00:00.000Z",
                        "grupo": "C",
                    }
                ],
                "force_refresh": False,
            },
        )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body[0]["resultadoA"] == 3
    assert body[0]["resultadoB"] == 1
    assert body[0]["vencedor"] == 1
    assert body[0]["status"] == "finished"
