'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // TODO: Integrar com Supabase Auth quando as contas forem criadas
      // Usuários de teste para desenvolvimento:
      const testUsers: Record<string, { role: string; name: string }> = {
        'admin@cavaleiros862.org': { role: 'admin', name: 'Administrador' },
        'mestre@cavaleiros862.org': { role: 'mestre_conselheiro', name: 'Mestre Conselheiro' },
        'primeiro@cavaleiros862.org': { role: 'primeiro_conselheiro', name: '1º Conselheiro' },
      };
      const testPassword = 'demolay862';

      const user = testUsers[email.trim().toLowerCase()];
      if (user && password === testPassword) {
        sessionStorage.setItem('dm_user', JSON.stringify({
          email: email.trim(),
          role: user.role,
          name: user.name,
        }));
        router.push('/painel');
        router.refresh();
      } else if (email && password) {
        setError('Email ou senha incorretos. Use as credenciais de teste.');
      } else {
        setError('Preencha email e senha.');
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-8">
          <h1 className="text-2xl font-bold text-blue-800 mb-2 text-center">
            Área do Membro
          </h1>
          <p className="text-slate-600 text-center mb-8 text-sm">
            Entre com seu email e senha para acessar o painel interno.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-slate-700 text-sm mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="seu@email.com"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-slate-700 text-sm mb-1">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
                required
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-slate-500 text-sm text-center space-y-1">
            <strong>Usuários de teste:</strong><br />
            admin@cavaleiros862.org / demolay862<br />
            mestre@cavaleiros862.org / demolay862<br />
            primeiro@cavaleiros862.org / demolay862
          </p>
        </div>

        <p className="mt-6 text-center text-slate-500 text-sm">
          <Link href="/" className="text-blue-600 hover:underline">
            ← Voltar ao início
          </Link>
        </p>
      </div>
    </div>
  );
}
