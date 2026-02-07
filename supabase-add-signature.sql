-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor)
-- 1) Adiciona coluna de assinatura na tabela profiles

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- 2) Bucket "signatures": crie no Dashboard (Storage > New bucket > Nome: "signatures").
-- 3) Políticas do bucket: execute o arquivo supabase-signatures-bucket-policies.sql no SQL Editor.
