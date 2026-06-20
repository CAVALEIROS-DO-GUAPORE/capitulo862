-- Execute no SQL Editor do Supabase se a tabela profiles já existir
-- Adiciona colunas phone, birth_date, avatar_url

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS instagram_url TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE news ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS author_role TEXT;
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

-- Configurações globais do site (modo manutenção)
CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  maintenance_enabled BOOLEAN NOT NULL DEFAULT false,
  maintenance_description TEXT,
  maintenance_return_date DATE,
  maintenance_return_time TIME,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

INSERT INTO site_settings (id, maintenance_enabled)
VALUES ('default', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read site settings" ON site_settings;
CREATE POLICY "Anyone can read site settings"
  ON site_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admin can update site settings" ON site_settings;
CREATE POLICY "Only admin can update site settings"
  ON site_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Campos extras da página de manutenção
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS maintenance_description TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS maintenance_return_date DATE;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS maintenance_return_time TIME;
