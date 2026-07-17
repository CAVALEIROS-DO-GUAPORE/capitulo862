-- Ouvidoria: reclamações, sugestões e elogios.
-- Visíveis somente para Mestre Conselheiro, admin e Conselho Consultivo.
-- Execute no SQL Editor do Supabase (ou via migration).
-- As APIs usam SUPABASE_SERVICE_ROLE_KEY (bypass RLS).

CREATE TABLE IF NOT EXISTS public.chapter_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('reclamacao', 'sugestao', 'elogio')),
  message TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chapter_feedback_created_at
  ON public.chapter_feedback (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chapter_feedback_type
  ON public.chapter_feedback (type);

ALTER TABLE public.chapter_feedback ENABLE ROW LEVEL SECURITY;
