'use client';

import { useEffect, useState } from 'react';

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

  const canInvite = user?.role && ['admin', 'mestre_conselheiro', 'primeiro_conselheiro'].includes(user.role);

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

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

  if (!user || !canInvite) {
    return (
      <div>
        <p className="text-slate-600">Você não tem permissão para cadastrar usuários.</p>
      </div>
    );
  }

  return (
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
  );
}
