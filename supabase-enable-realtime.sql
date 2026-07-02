-- Habilita Realtime (postgres_changes) nas tabelas do painel.
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor).
-- Pode ser executado mais de uma vez — ignora tabelas já incluídas ou inexistentes.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles',
    'news',
    'calendar_events',
    'minutes',
    'finance_entries',
    'finance_receipts',
    'members',
    'membership_candidates',
    'candidate_documents',
    'roll_calls',
    'raffle_sale_numbers'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t AND c.relkind = 'r'
    ) THEN
      RAISE NOTICE 'Tabela public.% não existe — ignorando.', t;
      CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      RAISE NOTICE 'Tabela public.% já está no Realtime — ignorando.', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    RAISE NOTICE 'Tabela public.% adicionada ao Realtime.', t;
  END LOOP;
END $$;
