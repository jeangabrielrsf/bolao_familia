-- Criar tabela palpites_grupos
CREATE TABLE "palpites_grupos" (
    "id" TEXT NOT NULL,
    "participante_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "apelido" TEXT NOT NULL,
    "fonte" TEXT NOT NULL DEFAULT 'excel',
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "palpites_grupos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "palpites_grupos_participante_id_nome_key" ON "palpites_grupos"("participante_id", "nome");

-- Adicionar FK para participantes
ALTER TABLE "palpites_grupos" ADD CONSTRAINT "palpites_grupos_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "participantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Adicionar coluna palpite_grupo_id (nullable inicialmente para migração)
ALTER TABLE "palpites" ADD COLUMN "palpite_grupo_id" TEXT;
ALTER TABLE "palpites_extras" ADD COLUMN "palpite_grupo_id" TEXT;

-- Migrar dados existentes: criar um grupo por participante que tem palpites
INSERT INTO "palpites_grupos" ("id", "participante_id", "nome", "apelido", "fonte")
SELECT
    gen_random_uuid()::text,
    p.id,
    p.nome,
    'Palpite 1',
    COALESCE(
        (SELECT p2.fonte FROM "palpites" p2 WHERE p2.participante_id = p.id LIMIT 1),
        'excel'
    )
FROM "participantes" p
WHERE EXISTS (SELECT 1 FROM "palpites" WHERE "participante_id" = p.id)
   OR EXISTS (SELECT 1 FROM "palpites_extras" WHERE "participante_id" = p.id);

-- Vincular palpites existentes aos grupos
UPDATE "palpites" SET "palpite_grupo_id" = pg.id
FROM "palpites_grupos" pg WHERE pg.participante_id = "palpites".participante_id;

-- Vincular extras existentes aos grupos
UPDATE "palpites_extras" SET "palpite_grupo_id" = pg.id
FROM "palpites_grupos" pg WHERE pg.participante_id = "palpites_extras".participante_id;

-- Tornar palpite_grupo_id NOT NULL
ALTER TABLE "palpites" ALTER COLUMN "palpite_grupo_id" SET NOT NULL;
ALTER TABLE "palpites_extras" ALTER COLUMN "palpite_grupo_id" SET NOT NULL;

-- Remover constraint antigas
ALTER TABLE "palpites" DROP CONSTRAINT IF EXISTS "palpites_participante_id_jogo_id_key";
ALTER TABLE "palpites_extras" DROP CONSTRAINT IF EXISTS "palpites_extras_participante_id_tipo_key";

-- Remover coluna participante_id
ALTER TABLE "palpites" DROP COLUMN "participante_id";
ALTER TABLE "palpites_extras" DROP COLUMN "participante_id";

-- Criar novas unique constraints
CREATE UNIQUE INDEX "palpites_palpite_grupo_id_jogo_id_key" ON "palpites"("palpite_grupo_id", "jogo_id");
CREATE UNIQUE INDEX "palpites_extras_palpite_grupo_id_tipo_key" ON "palpites_extras"("palpite_grupo_id", "tipo");

-- Criar FKs
ALTER TABLE "palpites" ADD CONSTRAINT "palpites_palpite_grupo_id_fkey" FOREIGN KEY ("palpite_grupo_id") REFERENCES "palpites_grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "palpites_extras" ADD CONSTRAINT "palpites_extras_palpite_grupo_id_fkey" FOREIGN KEY ("palpite_grupo_id") REFERENCES "palpites_grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
