-- Novas colunas para o modelo de ata com tags no Word.
-- Execute no SQL Editor do Supabase se a tabela minutes já existir.

ALTER TABLE minutes ADD COLUMN IF NOT EXISTS ata_gestao TEXT;
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS tio_conselho TEXT;
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS palavra_secreta TEXT;
ALTER TABLE minutes ADD COLUMN IF NOT EXISTS pauta TEXT;
