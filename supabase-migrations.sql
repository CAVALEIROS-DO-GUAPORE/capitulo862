-- Execute no SQL Editor do Supabase se a tabela profiles já existir
-- Adiciona colunas phone, birth_date, avatar_url

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Permite que usuários atualizem o próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Criar bucket avatars: no Supabase Dashboard > Storage > New bucket
-- Nome: avatars | Public: SIM
-- Policies (Storage > avatars > Policies):
--   - SELECT: true (público)
--   - INSERT: auth.role() = 'authenticated'
--   - DELETE: true (ou restringir conforme necessário)

-- Criar bucket news-images: no Supabase Dashboard > Storage > New bucket
-- Nome: news-images | Public: SIM
-- Policies: mesma lógica do avatars
