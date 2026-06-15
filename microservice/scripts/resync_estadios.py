"""Re-sync one-off de jogos com local/cidade NULL.

Bug original: o sync sobrescrevia `local`/`cidade` com NULL sempre que a
API externa não retornava o campo. Este script:

1. Conta NULLs ANTES.
2. Para cada jogo com local/cidade NULL e sofascore_id IS NOT NULL,
   busca dados via APIs externas e atualiza (apenas se novo valor for
   não-vazio — nunca escreve NULL em cima de NULL).
3. Conta NULLs DEPOIS + loga todas as alterações.
4. NÃO toca em jogos com valor existente (preservação).

Uso:
    DATABASE_URL=postgresql://... .venv/bin/python scripts/resync_estadios.py
"""
from __future__ import annotations

import asyncio
import logging
import os
import sys
from datetime import timezone

import asyncpg

# Permite rodar o script do diretório microservice
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services import football_data, worldcup26  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

WINDOW_HOURS = 24 * 30  # 30 dias — pega todos os jogos (grupos + mata-mata)


async def main() -> None:
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        logger.error("DATABASE_URL não definida")
        sys.exit(1)

    conn = await asyncpg.connect(db_url)
    try:
        # 1. Contagem ANTES
        antes = await conn.fetchrow(
            """
            SELECT
                COUNT(*) FILTER (WHERE local IS NULL AND sofascore_id IS NOT NULL) AS local_nulls,
                COUNT(*) FILTER (WHERE cidade IS NULL AND sofascore_id IS NOT NULL) AS cidade_nulls,
                COUNT(*) FILTER (WHERE sofascore_id IS NOT NULL) AS total_com_sofascore
            FROM jogos
            """
        )
        logger.info("=" * 60)
        logger.info("=== ANTES ===")
        logger.info(f"  Jogos com sofascore_id: {antes['total_com_sofascore']}")
        logger.info(f"  local IS NULL:          {antes['local_nulls']}")
        logger.info(f"  cidade IS NULL:         {antes['cidade_nulls']}")

        # 2. Buscar jogos com NULL e sofascore_id
        rows = await conn.fetch(
            """
            SELECT id, grupo, fase, data_hora, time_a, time_b, sofascore_id
            FROM jogos
            WHERE (local IS NULL OR cidade IS NULL)
              AND sofascore_id IS NOT NULL
            ORDER BY data_hora
            """
        )
        logger.info(f"  Jogos a processar:      {len(rows)}")

        if not rows:
            logger.info("Nenhum jogo precisa de re-sync.")
            return

        # 3. Buscar dados externos
        fd_matches = await football_data.get_all_wc_matches()
        wc_matches = await worldcup26.get_all_matches()
        wc_stadiums = await worldcup26.get_stadiums()

        if not fd_matches and not wc_matches:
            logger.error("Nenhuma API retornou dados. Abortando.")
            return

        # 4. Para cada jogo, casar com API e atualizar
        alteracoes: list[str] = []
        atualizados = 0

        for jogo in rows:
            dt_naive = jogo["data_hora"]
            dt_aware = dt_naive.replace(tzinfo=timezone.utc)
            data_hora_iso = dt_aware.isoformat().replace("+00:00", "Z")
            grupo = jogo["grupo"] or ""

            fd_result = None
            wc_result = None

            if fd_matches:
                fd_result = football_data.match_game(fd_matches, grupo, data_hora_iso)
            if wc_matches:
                wc_result = worldcup26.match_game(
                    wc_matches, grupo, data_hora_iso, wc_stadiums
                )

            novo_local: str | None = None
            nova_cidade: str | None = None

            if fd_result is not None:
                novo_local = fd_result.get("local")
                nova_cidade = fd_result.get("cidade")
            if not novo_local and wc_result is not None:
                novo_local = wc_result.get("local")
            if not nova_cidade and wc_result is not None:
                nova_cidade = wc_result.get("cidade")

            # Só atualiza se pelo menos um dos campos veio com valor não-nulo
            if not novo_local and not nova_cidade:
                continue

            # UPDATE: preserva valor existente se novo for None/vazio
            set_parts = []
            args: list = []

            if novo_local:
                set_parts.append(f"local = ${len(args) + 1}")
                args.append(novo_local)
            if nova_cidade:
                set_parts.append(f"cidade = ${len(args) + 1}")
                args.append(nova_cidade)

            if not set_parts:
                continue

            args.append(jogo["id"])
            sql = f"UPDATE jogos SET {', '.join(set_parts)} WHERE id = ${len(args)}"

            try:
                await conn.execute(sql, *args)
                alteracoes.append(
                    f"  [{jogo['id']}] {jogo['time_a']} vs {jogo['time_b']}: "
                    f"local=NULL→{novo_local!r} cidade=NULL→{nova_cidade!r}"
                )
                atualizados += 1
            except Exception:
                logger.exception(f"Falha ao atualizar jogo {jogo['id']}")

        # 5. Contagem DEPOIS
        depois = await conn.fetchrow(
            """
            SELECT
                COUNT(*) FILTER (WHERE local IS NULL AND sofascore_id IS NOT NULL) AS local_nulls,
                COUNT(*) FILTER (WHERE cidade IS NULL AND sofascore_id IS NOT NULL) AS cidade_nulls
            FROM jogos
            """
        )

        logger.info("=" * 60)
        logger.info("=== DEPOIS ===")
        logger.info(f"  local IS NULL:          {depois['local_nulls']}")
        logger.info(f"  cidade IS NULL:         {depois['cidade_nulls']}")
        logger.info(f"  Atualizados:            {atualizados}")
        logger.info("=" * 60)

        if alteracoes:
            logger.info("=== ALTERAÇÕES ===")
            for linha in alteracoes:
                logger.info(linha)

    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
