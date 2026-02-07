'use client';

import { useEffect, useState } from 'react';
import type { Member, MemberCategory } from '@/types';

const CATEGORIES = [
  { value: 'demolays', label: 'DeMolays' },
  { value: 'seniores', label: 'Sêniores' },
  { value: 'consultores', label: 'Consultores' },
  { value: 'escudeiros', label: 'Escudeiros' },
];

export default function PainelMembrosPage() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [form, setForm] = useState<{ name: string; role: string; category: MemberCategory; order: number }>({
    name: '',
    role: '',
    category: 'demolays',
    order: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canManage = user?.role && ['admin', 'mestre_conselheiro', 'primeiro_conselheiro'].includes(user.role);

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  function loadMembers() {
    fetch('/api/members')
      .then((r) => r.json())
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadMembers();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ name: '', role: '', category: 'demolays', order: members.length + 1 });
    setModal('add');
    setError('');
  }

  function openEdit(m: Member) {
    setEditing(m);
    setForm({ name: m.name, role: m.role, category: m.category, order: m.order });
    setModal('edit');
    setError('');
  }

  function closeModal() {
    setModal(null);
    setEditing(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const res = await fetch(`/api/members/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Erro ao atualizar');
        }
      } else {
        const res = await fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Erro ao cadastrar');
        }
      }
      loadMembers();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este membro?')) return;
    try {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      loadMembers();
    } catch {
      alert('Erro ao excluir');
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Gerenciar Membros</h1>
        {canManage && (
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            + Cadastrar Membro
          </button>
        )}
      </div>
      <p className="text-slate-600 mb-6">
        {canManage
          ? 'MC, 1º Conselheiro e Admin podem cadastrar, editar e excluir membros.'
          : 'Você não tem permissão para gerenciar membros.'}
      </p>

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="py-3 px-4 text-slate-600 font-medium">Nome</th>
                <th className="py-3 px-4 text-slate-600 font-medium">Cargo</th>
                <th className="py-3 px-4 text-slate-600 font-medium">Categoria</th>
                {canManage && <th className="py-3 px-4 text-slate-600 font-medium w-24">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-700">{m.name}</td>
                  <td className="py-3 px-4 text-blue-800 font-medium">{m.role}</td>
                  <td className="py-3 px-4 text-slate-600 capitalize">{m.category}</td>
                  {canManage && (
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(m)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {members.length === 0 && (
            <p className="py-8 text-center text-slate-500">Nenhum membro cadastrado.</p>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-blue-800 mb-4">
              {editing ? 'Editar Membro' : 'Cadastrar Membro'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-700 text-sm mb-1">Nome *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 text-sm mb-1">Cargo *</label>
                <input
                  type="text"
                  required
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="Ex: Mestre Conselheiro"
                />
              </div>
              <div>
                <label className="block text-slate-700 text-sm mb-1">Categoria *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Member['category'] }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-700 text-sm mb-1">Ordem</label>
                <input
                  type="number"
                  min={1}
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
