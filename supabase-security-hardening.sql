-- Endurecimento de segurança — execute no SQL Editor do Supabase
--
-- IMPORTANTE (Dashboard): Authentication > Providers > Email
--   Desative "Enable sign ups" para impedir registro público.
--   Usuários devem ser criados apenas via /api/auth/invite (admin/MC/1C).

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
