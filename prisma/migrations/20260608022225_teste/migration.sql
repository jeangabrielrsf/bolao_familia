-- CreateEnum
CREATE TYPE "Fase" AS ENUM ('grupos', 'oitavas', 'quartas', 'semifinal', 'terceiro', 'final');

-- CreateEnum
CREATE TYPE "StatusJogo" AS ENUM ('agendado', 'em_andamento', 'finalizado');

-- CreateEnum
CREATE TYPE "Fonte" AS ENUM ('excel', 'foto');

-- CreateEnum
CREATE TYPE "TipoExtra" AS ENUM ('artilheiro', 'campeao', 'vice', 'terceiro', 'quarto');

-- CreateEnum
CREATE TYPE "StatusUpload" AS ENUM ('sucesso', 'falha', 'pendente_revisao');

-- CreateTable
CREATE TABLE "participantes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "foto_url" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jogos" (
    "id" TEXT NOT NULL,
    "grupo" TEXT,
    "fase" "Fase" NOT NULL DEFAULT 'grupos',
    "data_hora" TIMESTAMP(3) NOT NULL,
    "time_a" TEXT NOT NULL,
    "time_b" TEXT NOT NULL,
    "resultado_a" INTEGER,
    "resultado_b" INTEGER,
    "status" "StatusJogo" NOT NULL DEFAULT 'agendado',
    "sofascore_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jogos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "palpites" (
    "id" TEXT NOT NULL,
    "participante_id" TEXT NOT NULL,
    "jogo_id" TEXT NOT NULL,
    "placar_a" INTEGER NOT NULL,
    "placar_b" INTEGER NOT NULL,
    "fonte" "Fonte" NOT NULL DEFAULT 'excel',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "palpites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "palpites_extras" (
    "id" TEXT NOT NULL,
    "participante_id" TEXT NOT NULL,
    "tipo" "TipoExtra" NOT NULL,
    "valor" TEXT NOT NULL,
    "fonte" "Fonte" NOT NULL DEFAULT 'excel',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "palpites_extras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resultados_extras" (
    "id" TEXT NOT NULL,
    "tipo" "TipoExtra" NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "resultados_extras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_logs" (
    "id" TEXT NOT NULL,
    "participante_id" TEXT NOT NULL,
    "tipo_arquivo" TEXT NOT NULL,
    "arquivo_url" TEXT NOT NULL,
    "status" "StatusUpload" NOT NULL DEFAULT 'sucesso',
    "erro" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracoes" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "configuracoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_auth" (
    "id" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,

    CONSTRAINT "admin_auth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "participantes_nome_key" ON "participantes"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "palpites_participante_id_jogo_id_key" ON "palpites"("participante_id", "jogo_id");

-- CreateIndex
CREATE UNIQUE INDEX "palpites_extras_participante_id_tipo_key" ON "palpites_extras"("participante_id", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "resultados_extras_tipo_key" ON "resultados_extras"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_chave_key" ON "configuracoes"("chave");

-- AddForeignKey
ALTER TABLE "palpites" ADD CONSTRAINT "palpites_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "participantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palpites" ADD CONSTRAINT "palpites_jogo_id_fkey" FOREIGN KEY ("jogo_id") REFERENCES "jogos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "palpites_extras" ADD CONSTRAINT "palpites_extras_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "participantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_logs" ADD CONSTRAINT "upload_logs_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "participantes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
