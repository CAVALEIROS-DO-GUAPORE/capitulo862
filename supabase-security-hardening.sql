-- Endurecimento de segurança — execute no SQL Editor do Supabase
--
-- IMPORTANTE (Dashboard): Authentication > Providers > Email
--   Desative "Enable sign ups" para impedir registro público.
--   Usuários devem ser criados apenas via /api/auth/invite (admin/MC/1C).
--
-- Storage (Dashboard): buckets finance-receipts e candidate-documents devem ser PRIVADOS.

-- 1) Novo usuário sempre recebe cargo "membro" (ignora metadata controlável pelo cliente)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    'membro'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2) Usuário comum não pode alterar o próprio cargo (evita escalação via Supabase client)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
  );

-- 3) Apenas admins alteram cargo de outros usuários (via client autenticado)
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin' AND p.active IS NOT FALSE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin' AND p.active IS NOT FALSE
    )
  );

-- 4) Leitura do próprio perfil (já existente; recria por consistência)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- 5) Impede INSERT manual em profiles (apenas trigger SECURITY DEFINER cria perfil)
DROP POLICY IF EXISTS "No direct profile insert" ON profiles;
CREATE POLICY "No direct profile insert"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- 6) Remove políticas permissivas em tabelas sensíveis (acesso só via API com service role)
DROP POLICY IF EXISTS "Authenticated can read finance receipts" ON finance_receipts;
DROP POLICY IF EXISTS "Authenticated can read candidate documents" ON candidate_documents;

-- 7) Garante RLS ativo (sem política = nega acesso direto pelo client)
ALTER TABLE IF EXISTS finance_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS candidate_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS finance_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS membership_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS roll_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS site_settings ENABLE ROW LEVEL SECURITY;
