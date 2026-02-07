# Cavaleiros do Guaporé nº 862

Site oficial do Capítulo DeMolay Cavaleiros do Guaporé número 862. PWA instalável, com área interna para membros.

## Tecnologias

- **Next.js 16** - React framework
- **Tailwind CSS** - Estilização
- **Supabase** - Banco de dados e autenticação (a configurar)
- **Vercel** - Hospedagem (a configurar)

## Desenvolvimento Local

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Páginas

- **/** - Home com formulário de candidatura (ficha para ser DeMolay)
- **/sobre** - História do Capítulo
- **/membros** - DeMolays, Sêniores, Consultores e Escudeiros
- **/noticias** - Notícias do Capítulo
- **/login** - Área do Membro (login)
- **/painel** - Painel interno (após login)
- **/painel/candidatos** - Candidaturas (MC e 1º Conselheiro)

## Permissões (área interna)

| Cargo | Cadastrar membros | Notícias | Calendário | Atas | Finanças |
|-------|-------------------|----------|------------|------|----------|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mestre Conselheiro | ✅ | ✅ | ✅ | ✅ | ✅ |
| 1º Conselheiro | ✅ | ✅ | ✅ | ✅ | ✅ |
| Escrivão | ❌ | ✅ | ❌ | ✅ | ❌ |
| Tesoureiro | ❌ | ❌ | ❌ | ❌ | ✅ |
| Demais | ❌ | ❌ | ❌ | Ver | Ver saldo |

**Candidaturas:** MC, 1º Conselheiro e Admin veem as fichas preenchidas por quem quer ser DeMolay.

## Configurar Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. No SQL Editor, execute o arquivo `supabase-schema.sql`
3. Copie `.env.local.example` para `.env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL` - URL do projeto
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Chave anônima (Settings > API)

## Criar usuários (login)

1. No Supabase: **Authentication** → **Users** → **Add user** → **Create new user**
2. Preencha email e senha, marque **Auto Confirm User**
3. Copie o **UID** do usuário criado
4. No **SQL Editor**, execute:
```sql
INSERT INTO profiles (id, email, name, role)
VALUES ('COLE_O_UID_AQUI', 'email@exemplo.com', 'Nome', 'admin')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, name = EXCLUDED.name, role = EXCLUDED.role;
```
5. Roles: `admin`, `mestre_conselheiro`, `primeiro_conselheiro`, `escrivao`, `tesoureiro`, `membro`

## Deploy na Vercel

1. Crie conta em [vercel.com](https://vercel.com)
2. Conecte o repositório Git do projeto
3. Adicione as variáveis de ambiente (Supabase URL e Key)
4. Deploy automático a cada push

## Instalar como app no celular

No navegador do celular (Chrome/Edge), acesse o site e use:
- **Menu** → **Instalar app** ou **Adicionar à tela inicial**
