-- Migração: todos os dados do painel no Supabase
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor).
-- As APIs usam SUPABASE_SERVICE_ROLE_KEY (bypass RLS).
-- Pré-requisito: execute antes o supabase-schema.sql (cria members, news, minutes, calendar_events, membership_candidates, finance_entries).

-- ========== MEMBERS: coluna phone e additional_roles (múltiplas categorias/cargos por pessoa) ==========
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS additional_roles JSONB DEFAULT '[]';

-- ========== MINUTES: colunas da ata estendida ==========
ALTER TABLE public.minutes ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'rascunho';
ALTER TABLE public.minutes ADD COLUMN IF NOT EXISTS ata_number INT;
ALTER TABLE public.minutes ADD COLUMN IF NOT EXISTS ata_year INT;
ALTER TABLE public.minutes ADD COLUMN IF NOT EXISTS date DATE;
ALTER TABLE public.minutes ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE public.minutes ADD COLUMN IF NOT EXISTS end_time TEXT;
ALTER TABLE public.minutes ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.minutes ADD COLUMN IF NOT EXISTS our_lodge BOOLEAN DEFAULT true;
ALTER TABLE public.minutes ADD COLUMN IF NOT EXISTS location_name TEXT;
ALTER TABLE public.minutes ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.minutes ADD COLUMN IF NOT EXISTS roll_call_id UUID;
ALTER TABLE public.minutes ADD COLUMN IF NOT EXISTS roll_call_date DATE;
ALTER TABLE public.minutes ADD COLUMN IF NOT EXISTS presiding_mc TEXT;
ALTER TABLE public.minutes ADD COLUMN IF NOT EXISTS presiding_1c TEXT;
ALTER TABLE public.minutes ADD COLUMN IF NOT EXISTS presiding_2c TEXT;
ALTER TABLE public.minutes ADD COLUMN IF NOT EXISTS tios_presentes JSONB DEFAULT '[]';
ALTER TABLE public.minutes ADD COLUMN IF NOT EXISTS trabalhos_texto TEXT;
ALTER TABLE public.minutes ADD COLUMN IF NOT EXISTS escrivao_name TEXT;

-- ========== ROLL_CALLS: chamada de presença ==========
CREATE TABLE IF NOT EXISTS public.roll_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  attendance JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  author_id UUID REFERENCES auth.users(id)
);

ALTER TABLE public.roll_calls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "roll_calls all" ON public.roll_calls;
CREATE POLICY "roll_calls all" ON public.roll_calls FOR ALL USING (true) WITH CHECK (true);

-- ========== Realtime (roll_calls) ==========
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'roll_calls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE roll_calls;
  END IF;
END $$;
