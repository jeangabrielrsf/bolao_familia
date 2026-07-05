ALTER TABLE "participantes" ADD COLUMN "liberacoes" JSONB NOT NULL DEFAULT '[]'::jsonb;
