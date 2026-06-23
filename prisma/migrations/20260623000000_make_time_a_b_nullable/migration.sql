-- Make time_a and time_b nullable so we can create mata-mata bracket slots
-- before the teams are determined by group stage results.
ALTER TABLE "jogos" ALTER COLUMN "time_a" DROP NOT NULL;
ALTER TABLE "jogos" ALTER COLUMN "time_b" DROP NOT NULL;
