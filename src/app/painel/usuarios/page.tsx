'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDialogs } from '@/components/DialogsProvider';

// Cargos do painel (rank interno): só estes ao criar/editar usuário. Cargos do capítulo (ex.: Sênior, Consultor) ficam no cadastro de Membros.
const PANEL_ROLES = [
  { value: 'membro', label: 'Membro' },
  { value: 'admin', label: 'Admin' },
  { value: 'mestre_conselheiro', label: 'Mestre Conselheiro' },
  { value: 'primeiro_conselheiro', label: '1º Conselheiro' },
  { value: 'tesoureiro', label: 'Tesoureiro' },
  { value: 'escrivao', label: 'Escrivão' },
];

const ROLE_LABELS: Record<string, string> = Object.fromEntries(PANEL_ROLES.map((r) => [r.value, r.label]));

interface UserItem {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
  active: boolean | null;
  created_at: string;
}

export default function PainelUsuariosPage() {
  const { confirm, toast } = useDialogs();
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
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canCreateUser = user?.role && ['admin', 'mestre_conselheiro', 'primeiro_conselheiro'].includes(user.role);
  const canResetPassword = canCreateUser;
  const canManageUsers = canCreateUser;

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  async function loadUsers() {
    if (!canManageUsers) return;
    setUsersLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/auth/users', { headers });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch {
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    if (canManageUsers) loadUsers();
  }, [canManageUsers]);

  useEffect(() => {
    if (!canManageUsers) return;
    const supabase = createClient();
    const channel = supabase
      .channel('profiles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => loadUsers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [canManageUsers]);

  async function handleRoleChange(u: UserItem, newRole: string) {
    if (newRole === u.role) return;
    setActionLoading(u.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/auth/users/${u.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao alterar cargo');
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao alterar cargo', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleActive(u: UserItem) {
    const ok = await confirm({
      title: u.active ? 'Inativar usuário' : 'Reativar usuário',
      message: u.active ? 'Inativar este usuário? Ele não poderá mais acessar o painel.' : 'Reativar este usuário?',
      confirmLabel: 'Sim',
      danger: !!u.active,
    });
    if (!ok) return;
    setActionLoading(u.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/auth/users/${u.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ active: !u.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro');
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, active: !u.active } : x)));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao alterar', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete(u: UserItem) {
    const ok = await confirm({
      title: 'Excluir usuário',
      message: `Excluir permanentemente o usuário ${u.email || u.name || u.id}? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    setActionLoading(u.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/auth/users/${u.id}`, { method: 'DELETE', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro');
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function getAuthHeaders(): Promise<HeadersInit> {
    const supabase = createClient();
    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      await supabase.auth.refreshSession();
      const r = await supabase.auth.getSession();
      session = r.data.session;
    }
    const token = session?.access_token;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const headers = await getAuthHeaders();
      if (!(headers as Record<string, string>)['Authorization']) {
        setError('Sessão expirada. Faça login novamente para cadastrar usuários.');
        return;
      }
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), name: name.trim() || undefined, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar usuário');
      setSuccess(data.message || 'Usuário cadastrado. Senha padrão: capitulo862. O usuário pode trocá-la no perfil.');
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

  if (!user || !canCreateUser) {
    return (
      <div>
        <p className="text-slate-600">Você não tem permissão para cadastrar usuários.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {canManageUsers && (
        <div className="border-b border-slate-200 pb-10">
          <h2 className="text-xl font-bold text-blue-800 mb-4">Usuários cadastrados</h2>
          {usersLoading ? (
            <p className="text-slate-500">Carregando...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Nome</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Email</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Cargo</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Status</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className={`border-t border-slate-200 ${u.active === false ? 'bg-slate-50 opacity-75' : ''}`}>
                      <td className="px-4 py-3 text-slate-800">{u.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 text-sm">{u.email || '—'}</td>
                      <td className="px-4 py-3">
                        <select
                          value={PANEL_ROLES.some((r) => r.value === u.role) ? u.role : 'membro'}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          disabled={actionLoading === u.id}
                          className="text-sm border border-slate-200 rounded px-2 py-1 bg-white text-slate-700 disabled:opacity-50"
                        >
                          {PANEL_ROLES.filter((r) => user?.role !== 'mestre_conselheiro' || r.value !== 'admin').map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${u.active !== false ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                          {u.active !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleToggleActive(u)}
                            disabled={actionLoading === u.id}
                            className="px-3 py-1 text-sm rounded border border-amber-600 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                          >
                            {actionLoading === u.id ? '...' : u.active !== false ? 'Inativar' : 'Ativar'}
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={actionLoading === u.id}
                            className="px-3 py-1 text-sm rounded border border-red-600 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <p className="py-8 text-center text-slate-500 bg-white border border-slate-200 rounded-lg">Nenhum usuário cadastrado.</p>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-blue-800 mb-6">Cadastrar usuário</h1>
        <p className="text-slate-600 mb-6">
          Cadastro de usuários do painel. Senha inicial: <strong>capitulo862</strong> (pode ser alterada em Perfil).
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
          <label className="block text-slate-700 text-sm font-medium mb-1">Cargo no painel</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
          >
            {PANEL_ROLES.filter((r) => user?.role !== 'mestre_conselheiro' || r.value !== 'admin').map((r) => (
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
          {loading ? 'Cadastrando...' : 'Cadastrar usuário'}
        </button>
      </form>
      </div>

      {canResetPassword && (
        <div className="border-t border-slate-200 pt-10">
          <h2 className="text-xl font-bold text-blue-800 mb-2">Redefinir senha de usuário</h2>
          <p className="text-slate-600 mb-4">
            Redefinir a senha de um usuário pelo email.
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
