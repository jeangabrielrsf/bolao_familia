-- Corrige typo "Uzebequistão" → "Uzbequistão" no nome de time armazenado nos jogos.
-- Apenas DML, sem mudança de schema. Afeta 2 linhas (1 com typo em time_a, 1 em time_b).
-- Palpites referenciam o jogo por jogoId (FK), não pelo nome, então não são afetados.
UPDATE jogos
SET time_b = 'Uzbequistão'
WHERE time_b = 'Uzebequistão';

UPDATE jogos
SET time_a = 'Uzbequistão'
WHERE time_a = 'Uzebequistão';
