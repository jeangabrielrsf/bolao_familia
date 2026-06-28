-- Adiciona colunas que já existem no Supabase mas não tinham migration.
-- Todas nullable — não afeta dados existentes.
ALTER TABLE "jogos" ADD COLUMN IF NOT EXISTS "local" TEXT;
ALTER TABLE "jogos" ADD COLUMN IF NOT EXISTS "cidade" TEXT;
ALTER TABLE "jogos" ADD COLUMN IF NOT EXISTS "vencedor" INTEGER;
ALTER TABLE "jogos" ADD COLUMN IF NOT EXISTS "ranking_time_a" INTEGER;
ALTER TABLE "jogos" ADD COLUMN IF NOT EXISTS "ranking_time_b" INTEGER;
ALTER TABLE "jogos" ADD COLUMN IF NOT EXISTS "placar_penaltis_a" INTEGER;
ALTER TABLE "jogos" ADD COLUMN IF NOT EXISTS "placar_penaltis_b" INTEGER;
