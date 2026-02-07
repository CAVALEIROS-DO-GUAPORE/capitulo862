-- Adiciona coluna para forçar troca de senha no primeiro login.
-- Execute no SQL Editor do Supabase (Dashboard > SQL Editor).
-- Depois disso, novos usuários criados pelo admin serão redirecionados ao Perfil para trocar a senha padrão.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
