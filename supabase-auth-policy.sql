-- Execute no SQL Editor do Supabase se você já rodou o schema principal antes
-- e precisa apenas adicionar a política de login (usuários leem seu próprio perfil)

CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
