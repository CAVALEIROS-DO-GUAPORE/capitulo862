-- Segurança das tabelas de sorteios: nega acesso direto via Supabase client (anon/authenticated).
-- Todas as operações passam pelas APIs com service role.

ALTER TABLE IF EXISTS public.raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.raffle_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.raffle_sale_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "raffles all" ON public.raffles;
DROP POLICY IF EXISTS "raffle_sales all" ON public.raffle_sales;
DROP POLICY IF EXISTS "raffle_sale_numbers all" ON public.raffle_sale_numbers;

CREATE UNIQUE INDEX IF NOT EXISTS idx_raffle_sale_numbers_unique
  ON public.raffle_sale_numbers (raffle_id, number);
