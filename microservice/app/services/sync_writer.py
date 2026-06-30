"""Lógica de comparação e escrita de resultados no DB.

Migrada de `src/app/api/resultados/sync/route.ts` (Next.js) para Python.
Mesma semântica: atualiza apenas o que mudou, preserva placar se não finalizado.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

import asyncpg

logger = logging.getLogger(__name__)


@dataclass
class MudancaJogo:
    jogoId: str
    timeA: str
    timeB: str
    grupo: str | None
    fase: str
    mudouPlacar: bool
    mudouStatus: bool
    mudouLocal: bool
    mudouCidade: bool
    antes: dict[str, Any]
    depois: dict[str, Any]


@dataclass
class SyncResult:
    success: bool = True
    skipped: str | None = None
    origem: str = "auto"
    duracaoMs: int = 0
    atualizados: int = 0
    finalizados: int = 0
    mudancas: list[MudancaJogo] = field(default_factory=list)


# Colunas atualizadas para cada caso. Hardcoded — não vem de input.
_COLUMNS_FINALIZADO: list[str] = [
    "resultado_a",
    "resultado_b",
    "vencedor",
    "placar_penaltis_a",
    "placar_penaltis_b",
    "status",
    "local",
    "cidade",
    "ranking_time_a",
    "ranking_time_b",
]

_COLUMNS_NAO_FINALIZADO: list[str] = [
    "status",
    "local",
    "cidade",
    "ranking_time_a",
    "ranking_time_b",
]


async def sincronizar_jogos(
    conn: asyncpg.Connection,
    jogos: list[asyncpg.Record],
    resultados: list[dict[str, Any]],
) -> SyncResult:
    """Compara `resultados` (das APIs externas) com `jogos` (do DB) e
    executa UPDATEs idempotentes.

    Args:
        conn: conexão asyncpg dentro de uma transação (com lock adquirido).
        jogos: registros da tabela `jogos` retornados por `SELECT *`.
        resultados: lista de dicts no formato do endpoint /resultados/lote.

    Returns:
        SyncResult com contadores e detalhes das mudanças.
    """
    # 1. Filtra resultados válidos (espelho de route.ts linhas 64-68)
    com_dados: list[dict[str, Any]] = [
        r
        for r in resultados
        if r.get("status") != "not_found" and r.get("sofascoreId")
    ]

    # 2. Identifica finalizados (espelho de route.ts linhas 70-75)
    finalizados_set: set[str] = {
        r["sofascoreId"]
        for r in com_dados
        if r.get("status") == "finished"
        and isinstance(r.get("resultadoA"), int)
        and r["resultadoA"] >= 0
        and isinstance(r.get("resultadoB"), int)
        and r["resultadoB"] >= 0
    }

    # 3. Compara cada resultado com o jogo atual
    mudancas: list[MudancaJogo] = []
    updates_count = 0

    for resultado in com_dados:
        sofascore_id: str = resultado["sofascoreId"]

        # Encontra jogo correspondente
        jogo = next(
            (j for j in jogos if j.get("sofascore_id") == sofascore_id), None
        )
        if jogo is None:
            logger.debug(f"Jogo com sofascore_id={sofascore_id} não encontrado no DB")
            continue

        is_finalizado = sofascore_id in finalizados_set

        # Calcula novos valores (espelho de route.ts linhas 89-96).
        # IMPORTANTE: se a API não retornar `local` ou `cidade`, preservar
        # o valor existente no DB em vez de sobrescrever com None
        # (regressão do bug que apagava nomes de estádios).
        novo_local: str | None = resultado.get("local") or jogo.get("local")
        nova_cidade: str | None = resultado.get("cidade") or jogo.get("cidade")
        novo_resultado_a: int | None = (
            resultado.get("resultadoA") if is_finalizado else None
        )
        novo_resultado_b: int | None = (
            resultado.get("resultadoB") if is_finalizado else None
        )
        if is_finalizado:
            novo_status = "finalizado"
        elif resultado.get("status") == "inprogress":
            novo_status = "em_andamento"
        else:
            novo_status = jogo.get("status")
        novo_vencedor: int | None = resultado.get("vencedor")
        novo_penaltis_a: int | None = resultado.get("placarPenaltisA")
        novo_penaltis_b: int | None = resultado.get("placarPenaltisB")

        # Compara (espelho de route.ts linhas 98-103)
        placar_mudou = (
            jogo.get("resultado_a") != novo_resultado_a
            or jogo.get("resultado_b") != novo_resultado_b
        )
        status_mudou = jogo.get("status") != novo_status
        local_mudou = jogo.get("local") != novo_local
        cidade_mudou = jogo.get("cidade") != nova_cidade
        vencedor_mudou = jogo.get("vencedor") != novo_vencedor

        realmente_mudou = (
            placar_mudou
            or status_mudou
            or local_mudou
            or cidade_mudou
            or vencedor_mudou
        )

        if not realmente_mudou:
            continue

        # Loga mudança (espírito de route.ts linhas 133-145)
        logger.info(
            f"\n[JOGO ATUALIZADO] {jogo['time_a']} vs {jogo['time_b']}"
        )
        if placar_mudou:
            logger.info(
                f"  Placar: {jogo.get('resultado_a')}x{jogo.get('resultado_b')} "
                f"→ {novo_resultado_a}x{novo_resultado_b}"
            )
        if status_mudou:
            logger.info(f"  Status: {jogo.get('status')} → {novo_status}")
        if local_mudou:
            logger.info(f"  Local: {jogo.get('local')} → {novo_local}")
        if cidade_mudou:
            logger.info(f"  Cidade: {jogo.get('cidade')} → {nova_cidade}")
        if vencedor_mudou:
            logger.info(f"  Vencedor: {jogo.get('vencedor')} → {novo_vencedor}")

        mudancas.append(
            MudancaJogo(
                jogoId=jogo["id"],
                timeA=jogo["time_a"],
                timeB=jogo["time_b"],
                grupo=jogo.get("grupo"),
                fase=jogo.get("fase"),
                mudouPlacar=placar_mudou,
                mudouStatus=status_mudou,
                mudouLocal=local_mudou,
                mudouCidade=cidade_mudou,
                antes={
                    "status": jogo.get("status"),
                    "resultadoA": jogo.get("resultado_a"),
                    "resultadoB": jogo.get("resultado_b"),
                    "local": jogo.get("local"),
                    "cidade": jogo.get("cidade"),
                },
                depois={
                    "status": novo_status,
                    "resultadoA": novo_resultado_a,
                    "resultadoB": novo_resultado_b,
                    "local": novo_local,
                    "cidade": nova_cidade,
                },
            )
        )

        # 4. UPDATE (espelho de route.ts linhas 147-178)
        columns = _COLUMNS_FINALIZADO if is_finalizado else _COLUMNS_NAO_FINALIZADO

        # Monta valores na ordem das colunas
        values: list[Any] = []
        for col in columns:
            if col == "resultado_a":
                values.append(novo_resultado_a)
            elif col == "resultado_b":
                values.append(novo_resultado_b)
            elif col == "vencedor":
                values.append(novo_vencedor)
            elif col == "placar_penaltis_a":
                values.append(novo_penaltis_a)
            elif col == "placar_penaltis_b":
                values.append(novo_penaltis_b)
            elif col == "status":
                values.append(novo_status)
            elif col == "local":
                values.append(novo_local)
            elif col == "cidade":
                values.append(nova_cidade)
            elif col == "ranking_time_a":
                values.append(None)
            elif col == "ranking_time_b":
                values.append(None)

        set_clause = ", ".join(f"{c} = ${i+1}" for i, c in enumerate(columns))
        where_clause = f"id = ${len(columns) + 1}"
        sql = f"UPDATE jogos SET {set_clause} WHERE {where_clause}"

        await conn.execute(sql, *values, jogo["id"])
        updates_count += 1

    return SyncResult(
        atualizados=updates_count,
        finalizados=len(finalizados_set),
        mudancas=mudancas,
    )
