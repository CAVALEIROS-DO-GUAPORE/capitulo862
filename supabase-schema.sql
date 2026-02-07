-- Schema Supabase para o site Cavaleiros do Guaporé nº 862
-- Execute no SQL Editor do Supabase após criar o projeto

-- Tabela de perfis (vinculada ao auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  name TEXT,
  phone TEXT,
  birth_date DATE,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'membro',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas se a tabela já existir (executar manualmente se necessário):
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birth_date DATE;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Tabela de membros (exibida no site)
CREATE TABLE IF NOT EXISTS members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  photo TEXT,
  role TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('demolays', 'seniores', 'consultores', 'escudeiros')),
  "order" INT DEFAULT 0,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de notícias
CREATE TABLE IF NOT EXISTS news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image TEXT,
  instagram_url TEXT,
  images TEXT[] DEFAULT '{}',
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de atas internas
CREATE TABLE IF NOT EXISTS minutes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de calendário
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  type TEXT CHECK (type IN ('ritualistica', 'evento', 'reuniao', 'outro')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de candidaturas (ficha para ser DeMolay)
CREATE TABLE IF NOT EXISTS membership_candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  mother_name TEXT NOT NULL,
  father_name TEXT,
  birth_date DATE NOT NULL,
  city TEXT NOT NULL,
  father_is_mason BOOLEAN DEFAULT FALSE,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  knows_demolay BOOLEAN DEFAULT FALSE,
  demolay_contact_name TEXT,
  interest_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_by_mc BOOLEAN DEFAULT FALSE,
  read_by_first_counselor BOOLEAN DEFAULT FALSE
);

-- Tabela de finanças
CREATE TABLE IF NOT EXISTS finance_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) - habilitar
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_entries ENABLE ROW LEVEL SECURITY;

-- Políticas: members e news são públicos para leitura (DROP evita erro se já existir)
DROP POLICY IF EXISTS "members public read" ON members;
CREATE POLICY "members public read" ON members FOR SELECT USING (true);
DROP POLICY IF EXISTS "news public read" ON news;
CREATE POLICY "news public read" ON news FOR SELECT USING (true);

-- Política: usuários leem e atualizam seu próprio perfil
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Storage: bucket avatars (criar no Supabase Dashboard > Storage)
-- Políticas no bucket avatars:
--   - SELECT: público (para exibir fotos)
--   - INSERT: auth.uid() IS NOT NULL
--   - DELETE: auth.uid() = (owner do arquivo, via RLS)

-- Trigger: cria perfil automaticamente quando usuário aceita convite
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'membro')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
