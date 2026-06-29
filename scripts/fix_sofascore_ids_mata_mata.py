"""Migration: troca sofascoreId placeholder (R32-M1, etc.) por IDs reais
do football-data.org para os 32 jogos da fase mata-mata.

Preserva palpites: `palpites.jogoId` é FK para `jogos.id` (UUID PK),
não para `sofascore_id`. Trocar `sofascore_id` é só UPDATE de coluna.

Background: o seed original (`scripts/seed.ts:165-201`) criou os mata-mata
com placeholders ("R32-M1" etc.) porque a integração com football-data.org
ainda não estava pronta. Agora que a API responde, o sync (`sync_runner.py`)
precisa dos IDs reais para casar com `match_game`.

Uso:
    # Dry run (recomendado primeiro):
    DATABASE_URL=... python scripts/fix_sofascore_ids_mata_mata.py --dry-run

    # Aplicar:
    DATABASE_URL=... python scripts/fix_sofascore_ids_mata_mata.py

Idempotente: se um placeholder já foi migrado, o UPDATE afeta 0 rows e
segue. Se o ID real já existe, é um conflito que logamos mas seguimos
(sofascore_id não tem constraint UNIQUE — o sync_writer usa o DB id).
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys

import asyncpg

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


# Mapping: placeholder → real football-data.org match ID.
# Extraído de https://api.football-data.org/v4/competitions/WC/matches
# Datas conferem 1-1 com `scripts/seed.ts:165-201`.
MAPPING: dict[str, str] = {
    # Round of 32
    "R32-M1":  "537417",  # 2026-06-28T19:00:00Z RSA x CAN
    "R32-M2":  "537415",  # 2026-06-29T20:30:00Z GER x PAR
    "R32-M3":  "537418",  # 2026-06-30T01:00:00Z NED x MAR
    "R32-M4":  "537423",  # 2026-06-29T17:00:00Z BRA x JPN
    "R32-M5":  "537416",  # 2026-06-30T21:00:00Z FRA x SWE
    "R32-M6":  "537424",  # 2026-06-30T17:00:00Z CIV x NOR
    "R32-M7":  "537425",  # 2026-07-01T01:00:00Z MEX x ECU
    "R32-M8":  "537426",  # 2026-07-01T16:00:00Z ENG x COD
    "R32-M9":  "537421",  # 2026-07-02T00:00:00Z USA x BIH
    "R32-M10": "537422",  # 2026-07-01T20:00:00Z BEL x SEN
    "R32-M11": "537419",  # 2026-07-02T23:00:00Z POR x CRO
    "R32-M12": "537420",  # 2026-07-02T19:00:00Z ESP x AUT
    "R32-M13": "537429",  # 2026-07-03T03:00:00Z SUI x ALG
    "R32-M14": "537427",  # 2026-07-03T22:00:00Z ARG x CPV
    "R32-M15": "537430",  # 2026-07-04T01:30:00Z COL x GHA
    "R32-M16": "537428",  # 2026-07-03T18:00:00Z AUS x EGY
    # Round of 16
    "R16-M1": "537376",  # 2026-07-04T17:00:00Z
    "R16-M2": "537375",  # 2026-07-04T21:00:00Z
    "R16-M3": "537377",  # 2026-07-05T20:00:00Z
    "R16-M4": "537378",  # 2026-07-06T00:00:00Z
    "R16-M5": "537379",  # 2026-07-06T19:00:00Z
    "R16-M6": "537380",  # 2026-07-07T00:00:00Z
    "R16-M7": "537381",  # 2026-07-07T16:00:00Z
    "R16-M8": "537382",  # 2026-07-07T20:00:00Z
    # Quarter-finals
    "QF-M1": "537383",  # 2026-07-09T20:00:00Z
    "QF-M2": "537384",  # 2026-07-10T19:00:00Z
    "QF-M3": "537385",  # 2026-07-11T21:00:00Z
    "QF-M4": "537386",  # 2026-07-12T01:00:00Z
    # Semi-finals
    "SF-M1": "537387",  # 2026-07-14T19:00:00Z
    "SF-M2": "537388",  # 2026-07-15T19:00:00Z
    # Third place
    "TP-M1": "537389",  # 2026-07-18T21:00:00Z
    # Final
    "F-M1":  "537390",  # 2026-07-19T19:00:00Z
}


async def count_palpites_por_jogo(conn: asyncpg.Connection) -> dict[str, int]:
    """Conta palpites agrupados por sofascore_id atual. Para verificação
    de que a migration não afetou palpites (mesmo jogoId, então mesmo count)."""
    rows = await conn.fetch("""
        SELECT j.sofascore_id, COUNT(p.id) AS palpites_count
        FROM jogos j
        LEFT JOIN palpites p ON p.jogo_id = j.id
        WHERE j.sofascore_id IS NOT NULL
        GROUP BY j.sofascore_id
    """)
    return {r['sofascore_id']: r['palpites_count'] for r in rows}


async def run_migration(dry_run: bool) -> None:
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        logger.error("DATABASE_URL não definida no env")
        sys.exit(1)

    conn = await asyncpg.connect(db_url)
    try:
        # 1. Snapshot ANTES — para comparar palpites depois
        logger.info("=" * 60)
        logger.info("=== ANTES ===")
        antes = await count_palpites_por_jogo(conn)
        total_palpites = sum(antes.values())
        logger.info(f"  Total de palpites no DB: {total_palpites}")
        for placeholder in MAPPING:
            count = antes.get(placeholder, 0)
            logger.info(f"  {placeholder:12s} → {MAPPING[placeholder]} (palpites: {count})")

        # 2. Verifica se algum ID real já existe (defesa em profundidade)
        reais_no_db = set(antes.keys()) - set(MAPPING.keys())
        conflitos = reais_no_db & set(MAPPING.values())
        if conflitos:
            logger.warning(
                f"ATENÇÃO: {len(conflitos)} ID(s) real(is) já existem no DB: {conflitos}. "
                "Migration prosseguirá, mas sync pode ter comportamento ambíguo."
            )

        # 3. Executa UPDATEs (ou só loga em dry-run)
        logger.info("=" * 60)
        logger.info(f"=== {'DRY-RUN' if dry_run else 'APLICANDO'} ===")
        atualizados = 0
        for placeholder, real_id in MAPPING.items():
            if dry_run:
                # Verifica se o placeholder existe
                count = await conn.fetchval(
                    "SELECT COUNT(*) FROM jogos WHERE sofascore_id = $1",
                    placeholder,
                )
                if count > 0:
                    logger.info(
                        f"  [DRY] {placeholder} → {real_id} "
                        f"({count} jogo(s) com palpites={antes.get(placeholder, 0)})"
                    )
                    atualizados += count
                else:
                    logger.info(f"  [DRY] {placeholder} → {real_id} (NÃO ENCONTRADO, skip)")
            else:
                count = await conn.fetchval(
                    "SELECT COUNT(*) FROM jogos WHERE sofascore_id = $1",
                    placeholder,
                )
                if count == 0:
                    logger.info(f"  [SKIP] {placeholder} não encontrado no DB")
                    continue
                palpites_count = antes.get(placeholder, 0)
                result = await conn.execute(
                    "UPDATE jogos SET sofascore_id = $1 WHERE sofascore_id = $2",
                    real_id, placeholder,
                )
                # result é "UPDATE N"
                updated_count = int(result.split()[-1]) if result.startswith("UPDATE") else 0
                logger.info(
                    f"  [OK]   {placeholder} → {real_id} "
                    f"(rows={updated_count}, palpites preservados={palpites_count})"
                )
                atualizados += updated_count

        # 4. Snapshot DEPOIS
        logger.info("=" * 60)
        if not dry_run:
            logger.info("=== DEPOIS ===")
            depois = await count_palpites_por_jogo(conn)
            total_depois = sum(depois.values())
            logger.info(f"  Total de palpites no DB: {total_depois}")
            if total_depois != total_palpites:
                logger.error(
                    f"!!! PALPITES PERDIDOS !!! antes={total_palpites} depois={total_depois}"
                )
                sys.exit(2)
            else:
                logger.info(f"  ✓ Palpites preservados ({total_palpites} == {total_depois})")

        logger.info("=" * 60)
        logger.info(f"RESUMO: {atualizados} jogos seriam/serão atualizados")
        if dry_run:
            logger.info("(dry-run — nada foi alterado no DB)")

    finally:
        await conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Substitui sofascoreId placeholder por ID real do football-data.org "
        "para os 32 jogos da fase mata-mata. Preserva palpites.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Apenas mostra o que seria feito, sem alterar o DB",
    )
    args = parser.parse_args()
    asyncio.run(run_migration(dry_run=args.dry_run))


if __name__ == "__main__":
    main()
