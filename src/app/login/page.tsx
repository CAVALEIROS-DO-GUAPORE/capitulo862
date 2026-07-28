'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [maintenanceActive, setMaintenanceActive] = useState(false);

  useEffect(() => {
    fetch('/api/settings/maintenance')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMaintenanceActive(data?.maintenanceEnabled === true))
      .catch(() => {});
  }, []);

  async function resolveEmail(loginValue: string): Promise<string> {
    const trimmed = loginValue.trim();
    if (trimmed.includes('@')) return trimmed.toLowerCase();

    const res = await fetch('/api/auth/resolve-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: trimmed }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Não foi possível identificar a conta.');
    }
    if (!data.email) {
      throw new Error('Conta não encontrada.');
    }
    return String(data.email);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const email = await resolveEmail(login);
      const supabase = createClient();

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        const msg = authError.message;
        if (msg === 'Invalid login credentials') {
          setError('E-mail/ID ou senha incorretos.');
        } else if (msg === 'Failed to fetch' || msg.includes('fetch') || msg.includes('network')) {
          setError('Não foi possível conectar ao servidor. Verifique sua internet e se o painel está configurado (Supabase).');
        } else {
          setError(msg);
        }
        return;
      }

      if (!authData.user) {
        setError('Erro ao fazer login. Tente novamente.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('email, name, role, avatar_url, active')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        await supabase.auth.signOut();
        setError('Perfil não encontrado. Entre em contato com o Capítulo.');
        return;
      }

      if (profile.active === false) {
        await supabase.auth.signOut();
        setError('Esta conta está inativa. Entre em contato com o Capítulo.');
        return;
      }

      const maintenanceRes = await fetch('/api/settings/maintenance');
      if (maintenanceRes.ok) {
        const maintenanceData = await maintenanceRes.json();
        if (maintenanceData.maintenanceEnabled === true && profile.role !== 'admin') {
          await supabase.auth.signOut();
          setError('O site está em manutenção. Apenas o administrador pode acessar no momento.');
          return;
        }
      }

      let mustChangePassword = false;
      const { data: flagRow, error: flagError } = await supabase
        .from('profiles')
        .select('must_change_password')
        .eq('id', authData.user.id)
        .single();
      if (!flagError && flagRow?.must_change_password === true) mustChangePassword = true;

      sessionStorage.setItem(
        'dm_user',
        JSON.stringify({
          id: authData.user.id,
          email: profile.email || authData.user.email,
          role: profile.role || 'membro',
          name: profile.name || 'Membro',
          avatarUrl: profile.avatar_url || null,
          mustChangePassword: mustChangePassword,
        })
      );

      const target = mustChangePassword ? '/painel/perfil?trocar=1' : '/painel';
      window.location.href = target;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'Failed to fetch' || msg.includes('fetch') || msg.includes('network')) {
        setError('Não foi possível conectar ao servidor. Verifique sua internet e se o painel está configurado (Supabase).');
      } else if (msg) {
        setError(msg);
      } else {
        setError('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-8">
          <h1 className="text-2xl font-bold text-blue-800 mb-2 text-center">Área do Membro</h1>
          <p className="text-slate-600 text-center mb-8 text-sm">
            {maintenanceActive
              ? 'Site em manutenção. Apenas o administrador pode entrar para testes.'
              : 'Entre com seu e-mail ou ID de membro e a senha para acessar o painel.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login" className="block text-slate-700 text-sm mb-1">
                E-mail ou ID
              </label>
              <input
                id="login"
                type="text"
                autoComplete="username"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="seu@email.com ou ID"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                ID 0 não permite login — use o e-mail nestes casos.
              </p>
            </div>
            <div>
              <label htmlFor="password" className="block text-slate-700 text-sm mb-1">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg transition-colors"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-slate-500 text-sm">
          {maintenanceActive ? (
            <Link href="/manutencao" className="text-blue-600 hover:underline">
              ← Voltar à página de manutenção
            </Link>
          ) : (
            <Link href="/" className="text-blue-600 hover:underline">
              ← Voltar ao início
            </Link>
          )}
        </p>
      </div>
    </div>
  );
}
