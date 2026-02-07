'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const ROLES = [
  { value: 'membro', label: 'Membro' },
  { value: 'admin', label: 'Admin' },
  { value: 'mestre_conselheiro', label: 'Mestre Conselheiro' },
  { value: 'primeiro_conselheiro', label: '1º Conselheiro' },
  { value: 'escrivao', label: 'Escrivão' },
  { value: 'tesoureiro', label: 'Tesoureiro' },
];

export default function PainelUsuariosPage() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('membro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const canInvite = user?.role && ['admin', 'mestre_conselheiro', 'primeiro_conselheiro'].includes(user.role);
  const canResetPassword = canInvite;

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  async function getAuthHeaders(): Promise<HeadersInit> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar convite');
      setSuccess('Convite enviado! O usuário receberá um link por email para criar a senha.');
      setEmail('');
      setName('');
      setRole('membro');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    setResetSuccess('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: resetEmail.trim(), newPassword: resetPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao redefinir senha');
      setResetSuccess('Senha alterada com sucesso.');
      setResetEmail('');
      setResetPassword('');
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setResetLoading(false);
    }
  }

  if (!user || !canInvite) {
    return (
      <div>
        <p className="text-slate-600">Você não tem permissão para cadastrar usuários.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-blue-800 mb-6">Cadastrar usuário</h1>
        <p className="text-slate-600 mb-6">
          Informe o email do novo usuário. Ele receberá um link por email para criar a senha e acessar o painel.
        </p>

        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <div>
          <label className="block text-slate-700 text-sm font-medium mb-1">Email *</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            placeholder="usuario@email.com"
          />
        </div>
        <div>
          <label className="block text-slate-700 text-sm font-medium mb-1">Nome (opcional)</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            placeholder="Nome do usuário"
          />
        </div>
        <div>
          <label className="block text-slate-700 text-sm font-medium mb-1">Cargo/Função</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg"
        >
          {loading ? 'Enviando...' : 'Enviar convite'}
        </button>
      </form>
      </div>

      {canResetPassword && (
        <div className="border-t border-slate-200 pt-10">
          <h2 className="text-xl font-bold text-blue-800 mb-2">Redefinir senha de usuário</h2>
          <p className="text-slate-600 mb-4">
            MC, 1º Conselheiro e Admin podem alterar a senha de qualquer usuário, caso precise.
          </p>
          <form onSubmit={handleResetPassword} className="max-w-md space-y-4">
            <div>
              <label className="block text-slate-700 text-sm font-medium mb-1">Email do usuário *</label>
              <input
                type="email"
                required
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="usuario@email.com"
              />
            </div>
            <div>
              <label className="block text-slate-700 text-sm font-medium mb-1">Nova senha *</label>
              <input
                type="password"
                required
                minLength={6}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="••••••••"
              />
              <p className="text-slate-500 text-xs mt-1">Mínimo de 6 caracteres</p>
            </div>
            {resetError && <p className="text-red-600 text-sm">{resetError}</p>}
            {resetSuccess && <p className="text-green-600 text-sm">{resetSuccess}</p>}
            <button
              type="submit"
              disabled={resetLoading}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold rounded-lg"
            >
              {resetLoading ? 'Alterando...' : 'Alterar senha'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
