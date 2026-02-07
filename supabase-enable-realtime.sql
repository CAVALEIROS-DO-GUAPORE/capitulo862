-- Habilita Realtime (postgres_changes) nas tabelas do painel.
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor).
-- Depois disso, listas e perfil atualizam em tempo real quando alguém altera dados.

ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE news;
ALTER PUBLICATION supabase_realtime ADD TABLE calendar_events;
ALTER PUBLICATION supabase_realtime ADD TABLE minutes;
ALTER PUBLICATION supabase_realtime ADD TABLE finance_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE members;
ALTER PUBLICATION supabase_realtime ADD TABLE membership_candidates;
