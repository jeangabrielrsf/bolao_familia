import pytest
from unittest.mock import patch
import httpx

from app.services import bracket_client


@pytest.mark.asyncio
async def test_notificar_bracket_sucesso():
    """Chama notificar_bracket com NEXTJS_BASE_URL + CRON_SECRET setados.
    Espera request POST correto com header X-Cron-Secret."""
    captured = {}

    class FakeResponse:
        status_code = 200
        def json(self):
            return {"success": True, "atualizados": 5}
        def raise_for_status(self):
            pass

    class FakeClient:
        async def __aenter__(self): return self
        async def __aexit__(self, *a): pass
        async def post(self, url, headers=None, timeout=None):
            captured["url"] = url
            captured["headers"] = headers
            return FakeResponse()

    with patch.object(bracket_client.httpx, "AsyncClient", return_value=FakeClient()):
        with patch.object(bracket_client.settings, "NEXTJS_BASE_URL", "https://bolao.test"):
            with patch.object(bracket_client.settings, "CRON_SECRET", "sekret"):
                result = await bracket_client.notificar_bracket()

    assert result == {"success": True, "atualizados": 5}
    assert captured["url"] == "https://bolao.test/api/admin/bracket/atualizar"
    assert captured["headers"]["X-Cron-Secret"] == "sekret"


@pytest.mark.asyncio
async def test_notificar_bracket_sem_nextjs_base_url_retorna_none():
    """NEXTJS_BASE_URL não setado → não tenta chamar, retorna None."""
    with patch.object(bracket_client.settings, "NEXTJS_BASE_URL", ""):
        result = await bracket_client.notificar_bracket()
    assert result is None


@pytest.mark.asyncio
async def test_notificar_bracket_falha_http_nao_propaga_erro():
    """Erro HTTP não quebra o sync — loga e retorna None."""
    class FakeClient:
        async def __aenter__(self): return self
        async def __aexit__(self, *a): pass
        async def post(self, url, headers=None, timeout=None):
            raise httpx.HTTPError("timeout")

    with patch.object(bracket_client.httpx, "AsyncClient", return_value=FakeClient()):
        with patch.object(bracket_client.settings, "NEXTJS_BASE_URL", "https://bolao.test"):
            with patch.object(bracket_client.settings, "CRON_SECRET", "sekret"):
                result = await bracket_client.notificar_bracket()

    assert result is None
