"""Testes de regressão para sync_writer.sincronizar_jogos.

Garantem que o sync não apague valores existentes no DB quando a API
externa não retorna `local` ou `cidade` (ou retorna None).

Bug original: src/app/api/resultados/sync/route.ts e
microservice/app/services/sync_writer.py sobrescreviam `local` com None
sempre que a API não retornava o campo, mesmo que o DB já tivesse valor.
"""
from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.services import sync_writer


def _make_jogo(
    *,
    jogo_id: str = "jogo-1",
    sofascore_id: str = "sofascore-1",
    time_a: str = "Brasil",
    time_b: str = "Argentina",
    local: str | None = "Mercedes-Benz Stadium",
    cidade: str | None = "Atlanta",
    status: str = "agendado",
    resultado_a: int | None = None,
    resultado_b: int | None = None,
) -> dict[str, Any]:
    """Constrói um registro (record-like) no formato que sync_writer espera."""
    return {
        "id": jogo_id,
        "sofascore_id": sofascore_id,
        "time_a": time_a,
        "time_b": time_b,
        "grupo": "GROUP_A",
        "fase": "grupos",
        "data_hora": None,
        "local": local,
        "cidade": cidade,
        "status": status,
        "resultado_a": resultado_a,
        "resultado_b": resultado_b,
        "vencedor": None,
        "placar_penaltis_a": None,
        "placar_penaltis_b": None,
    }


def _make_resultado(
    *,
    sofascore_id: str = "sofascore-1",
    local: str | None = None,
    cidade: str | None = None,
    status: str = "notstarted",
    resultado_a: int | None = None,
    resultado_b: int | None = None,
) -> dict[str, Any]:
    """Constrói um resultado vindo da API externa."""
    return {
        "sofascoreId": sofascore_id,
        "resultadoA": resultado_a if resultado_a is not None else 0,
        "resultadoB": resultado_b if resultado_b is not None else 0,
        "status": status,
        "local": local,
        "cidade": cidade,
        "vencedor": None,
        "placarPenaltisA": None,
        "placarPenaltisB": None,
    }


def _make_mock_conn() -> AsyncMock:
    """Mock de asyncpg.Connection com execute() capturável."""
    conn = AsyncMock()
    conn.execute = AsyncMock(return_value="UPDATE 0")
    return conn


def _captured_updates(conn: AsyncMock) -> list[tuple[str, tuple]]:
    """Extrai (sql, args) de cada chamada de conn.execute()."""
    return [(c.args[0], c.args[1:]) for c in conn.execute.call_args_list]


@pytest.mark.asyncio
async def test_local_preservado_quando_api_retorna_none() -> None:
    """REGRESSÃO: API sem local não deve apagar local do DB.

    Cenário: jogo tem local='Mercedes-Benz Stadium' no DB.
    API retorna local=None.
    Esperado: UPDATE NÃO seta local (preserva o valor existente).
    """
    jogo = _make_jogo(local="Mercedes-Benz Stadium")
    resultado = _make_resultado(local=None, cidade="Atlanta")
    conn = _make_mock_conn()

    sync_result = await sync_writer.sincronizar_jogos(conn, [jogo], [resultado])

    updates = _captured_updates(conn)
    if updates:
        sql, args = updates[0]
        args_dict = _bind_args(sql, args, sync_writer._COLUMNS_NAO_FINALIZADO)
        assert "local" not in args_dict or args_dict.get("local") not in (None, "null"), (
            f"local foi setado para {args_dict.get('local')!r} — deveria preservar "
            f"o valor 'Mercedes-Benz Stadium' do DB"
        )

    assert sync_result.atualizados == 0, (
        f"Esperava 0 atualizações (nada mudou de fato), mas foram feitas "
        f"{sync_result.atualizados}"
    )


@pytest.mark.asyncio
async def test_cidade_preservada_quando_api_retorna_none() -> None:
    """REGRESSÃO: API sem cidade não deve apagar cidade do DB.

    Espelha o teste de local — cidade já tinha o pattern correto antes
    do fix, este teste serve como guard contra regressão futura.
    """
    jogo = _make_jogo(cidade="Atlanta")
    resultado = _make_resultado(local="Mercedes-Benz Stadium", cidade=None)
    conn = _make_mock_conn()

    sync_result = await sync_writer.sincronizar_jogos(conn, [jogo], [resultado])

    updates = _captured_updates(conn)
    if updates:
        sql, args = updates[0]
        args_dict = _bind_args(sql, args, sync_writer._COLUMNS_NAO_FINALIZADO)
        assert "cidade" not in args_dict or args_dict.get("cidade") not in (None, "null"), (
            f"cidade foi setada para {args_dict.get('cidade')!r} — deveria preservar 'Atlanta'"
        )

    assert sync_result.atualizados == 0


@pytest.mark.asyncio
async def test_local_preenchido_quando_db_null_e_api_tem_valor() -> None:
    """Caminho feliz: DB tem local=None, API retorna 'Mercedes-Benz Stadium'.

    UPDATE deve setar local='Mercedes-Benz Stadium'.
    """
    jogo = _make_jogo(local=None)
    resultado = _make_resultado(local="Mercedes-Benz Stadium", cidade="Atlanta")
    conn = _make_mock_conn()

    sync_result = await sync_writer.sincronizar_jogos(conn, [jogo], [resultado])

    assert sync_result.atualizados == 1, "Deveria ter 1 atualização (preencheu local)"
    updates = _captured_updates(conn)
    assert len(updates) == 1
    sql, args = updates[0]
    args_dict = _bind_args(sql, args, sync_writer._COLUMNS_NAO_FINALIZADO)
    assert args_dict.get("local") == "Mercedes-Benz Stadium"


@pytest.mark.asyncio
async def test_idempotencia_segundo_sync_sem_mudanca() -> None:
    """Rodar sync 2x com mesmos dados não deve duplicar updates.

    Cenário: DB tem local=None, API retorna valor.
    - 1º sync: atualiza (preenche local).
    - 2º sync (DB agora = API): não atualiza.
    """
    jogo_inicial = _make_jogo(local=None)
    resultado = _make_resultado(local="Mercedes-Benz Stadium", cidade="Atlanta")

    conn1 = _make_mock_conn()
    first = await sync_writer.sincronizar_jogos(conn1, [jogo_inicial], [resultado])
    assert first.atualizados == 1, "Primeiro sync deve popular local"

    jogo_apos = _make_jogo(local="Mercedes-Benz Stadium", cidade="Atlanta")
    conn2 = _make_mock_conn()
    second = await sync_writer.sincronizar_jogos(conn2, [jogo_apos], [resultado])
    assert second.atualizados == 0, "Segundo sync não deve duplicar"
    assert len(_captured_updates(conn2)) == 0


def _bind_args(sql: str, args: tuple, columns: list[str]) -> dict[str, Any]:
    """Mapeia args posicionais (UPDATE col=$1, col=$2) para dict {col: valor}."""
    import re

    placeholders = re.findall(r"= \$(\d+)", sql)
    result: dict[str, Any] = {}
    for i, col in enumerate(columns):
        if f"${i + 1}" in placeholders or str(i + 1) in placeholders:
            if i < len(args):
                result[col] = args[i]
    return result
