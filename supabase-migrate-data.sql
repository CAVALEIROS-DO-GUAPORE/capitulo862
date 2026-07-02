-- Migração: todos os dados do painel no Supabase
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor).
-- As APIs usam SUPABASE_SERVICE_ROLE_KEY (bypass RLS).
-- Pré-requisito: execute antes o supabase-schema.sql (cria members, news, minutes, calendar_events, membership_candidates, finance_entries).

-- ========== MEMBERS: coluna phone e additional_roles (múltiplas categorias/cargos por pessoa) ==========
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS additional_roles JSONB DEFAULT '[]';
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]';

-- ========== ROLL_CALLS: reuniões por tipo (ritualística, administrativa, controle) ==========
ALTER TABLE public.roll_calls DROP CONSTRAINT IF EXISTS roll_calls_date_key;
ALTER TABLE public.roll_calls ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT 'ritualistica';
ALTER TABLE public.roll_calls ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.roll_calls ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.roll_calls ADD COLUMN IF NOT EXISTS start_time TEXT;
ALTER TABLE public.roll_calls ADD COLUMN IF NOT EXISTS end_time TEXT;
UPDATE public.roll_calls SET meeting_type = 'ritualistica' WHERE meeting_type IS NULL;

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

-- ========== SORTEIOS (raffles): vendas de números ==========
CREATE TABLE IF NOT EXISTS public.raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price_per_number NUMERIC(10,2) NOT NULL,
  prizes JSONB NOT NULL DEFAULT '[]',
  draw_at TIMESTAMPTZ NOT NULL,
  whatsapp_contact TEXT NOT NULL,
  pix_key TEXT NOT NULL,
  total_numbers INTEGER NOT NULL DEFAULT 100 CHECK (total_numbers > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'drawn')),
  banner_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.raffle_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  buyer_phone_extra TEXT,
  seller_user_id UUID REFERENCES auth.users(id),
  receipt_path TEXT,
  receipt_file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.raffle_sale_numbers (
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  number INTEGER NOT NULL CHECK (number > 0),
  sale_id UUID NOT NULL REFERENCES public.raffle_sales(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  PRIMARY KEY (raffle_id, number)
);

CREATE INDEX IF NOT EXISTS idx_raffle_sales_raffle_id ON public.raffle_sales(raffle_id);
CREATE INDEX IF NOT EXISTS idx_raffle_sale_numbers_sale_id ON public.raffle_sale_numbers(sale_id);

ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_sale_numbers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "raffles all" ON public.raffles;
CREATE POLICY "raffles all" ON public.raffles FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "raffle_sales all" ON public.raffle_sales;
CREATE POLICY "raffle_sales all" ON public.raffle_sales FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "raffle_sale_numbers all" ON public.raffle_sale_numbers;
CREATE POLICY "raffle_sale_numbers all" ON public.raffle_sale_numbers FOR ALL USING (true) WITH CHECK (true);

-- Após deploy: execute supabase-raffles-security.sql para remover políticas permissivas.

-- Bucket Storage: crie "raffle-receipts" (privado) e "raffle-images" (público) no Supabase Storage.

ALTER TABLE public.raffles ADD COLUMN IF NOT EXISTS banner_url TEXT;
