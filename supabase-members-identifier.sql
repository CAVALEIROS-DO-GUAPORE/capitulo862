-- Número identificador (ID) do membro. Use 0 para ainda não definido.
-- Execute no SQL Editor do Supabase se a tabela members já existir.
-- Se você já criou uma coluna com outro nome (ex.: numero_id), use apenas o UPDATE
-- e no código o app aceita também numero_id.

ALTER TABLE members ADD COLUMN IF NOT EXISTS identifier INT DEFAULT 0;
UPDATE members SET identifier = 0 WHERE identifier IS NULL;

-- ID > 0 deve ser único. Vários membros podem ter ID 0 (ainda não definido).
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_identifier_unique
  ON public.members (identifier)
  WHERE identifier > 0;
