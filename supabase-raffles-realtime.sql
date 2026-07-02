-- Realtime para sorteios: números vendidos atualizam em tempo real no painel e na página pública.
-- Execute no SQL Editor do Supabase após supabase-raffles-security.sql e supabase-enable-realtime.sql.

-- SELECT necessário para o Supabase Realtime entregar eventos postgres_changes.
-- Apenas número + nome do comprador (já expostos em /api/raffles/public). Sem INSERT/UPDATE/DELETE.
DROP POLICY IF EXISTS "raffle_sale_numbers public read" ON public.raffle_sale_numbers;
CREATE POLICY "raffle_sale_numbers public read" ON public.raffle_sale_numbers
  FOR SELECT USING (true);
