-- Editais: PDFs publicados na aba Editais (Secretaria > Downloads).
-- Execute no SQL Editor do Supabase.
-- Crie também o bucket privado "edital-pdfs" no Storage (Dashboard > Storage).

CREATE TABLE IF NOT EXISTS public.editais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  pdf_path TEXT NOT NULL,
  pdf_file_name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_editais_created_at ON public.editais(created_at DESC);

ALTER TABLE public.editais ENABLE ROW LEVEL SECURITY;
