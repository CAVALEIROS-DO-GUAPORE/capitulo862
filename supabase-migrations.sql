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

-- Comprovantes de lançamentos financeiros
CREATE TABLE IF NOT EXISTS finance_receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  finance_entry_id UUID NOT NULL REFERENCES finance_entries(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS finance_receipts_entry_id_idx ON finance_receipts(finance_entry_id);

ALTER TABLE finance_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read finance receipts" ON finance_receipts;
CREATE POLICY "Authenticated can read finance receipts"
  ON finance_receipts FOR SELECT
  TO authenticated
  USING (true);

-- Criar bucket finance-receipts: Supabase Dashboard > Storage > New bucket
-- Nome: finance-receipts | Public: NÃO (privado — download via API autenticada)

-- Documentos de candidaturas (ficha solicitação, sindicância, etc.)
ALTER TABLE membership_candidates ADD COLUMN IF NOT EXISTS sindicancia_resumo TEXT;

CREATE TABLE IF NOT EXISTS candidate_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES membership_candidates(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id, doc_type)
);

CREATE INDEX IF NOT EXISTS candidate_documents_candidate_id_idx ON candidate_documents(candidate_id);

ALTER TABLE candidate_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read candidate documents" ON candidate_documents;
CREATE POLICY "Authenticated can read candidate documents"
  ON candidate_documents FOR SELECT
  TO authenticated
  USING (true);

-- Criar bucket candidate-documents: Supabase Dashboard > Storage > New bucket
-- Nome: candidate-documents | Public: NÃO
