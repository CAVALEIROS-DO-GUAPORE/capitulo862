-- Colunas extras em roll_calls para relatório único por ano/gestão.
-- Execute no SQL Editor do Supabase.

ALTER TABLE roll_calls ADD COLUMN IF NOT EXISTS gestao TEXT;
ALTER TABLE roll_calls ADD COLUMN IF NOT EXISTS tipo_reuniao TEXT;
ALTER TABLE roll_calls ADD COLUMN IF NOT EXISTS breve_descricao TEXT;
