'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { Member, MemberCategory, MemberAdditionalRole } from '@/types';

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
  const [form, setForm] = useState<{
    name: string;
    role: string;
    category: MemberCategory;
    order: number;
    phone: string;
    additionalRoles: MemberAdditionalRole[];
  }>({
    name: '',
    role: '',
    category: 'demolays',
    order: 0,
    phone: '',
    additionalRoles: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<Member | null>(null);
  const canManage = user?.role && ['admin', 'mestre_conselheiro', 'primeiro_conselheiro'].includes(user.role);

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const loadMembers = useCallback(function loadMembers() {
    fetch('/api/members')
      .then((r) => r.json())
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('members-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => loadMembers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadMembers]);

  function openAdd() {
    setEditing(null);
    setViewing(null);
    setForm({ name: '', role: '', category: 'demolays', order: members.length + 1, phone: '', additionalRoles: [] });
    setModal('add');
    setError('');
  }

  function openEdit(m: Member) {
    setEditing(m);
    setViewing(null);
    setForm({
      name: m.name,
      role: m.role,
      category: m.category,
      order: m.order,
      phone: m.phone || '',
      additionalRoles: m.additionalRoles?.slice() ?? [],
    });
    setModal('edit');
    setError('');
  }

  function addAdditionalRole() {
    const used: MemberCategory[] = [form.category, ...form.additionalRoles.map((r) => r.category)];
    const available = CATEGORIES.filter((c) => !used.includes(c.value as MemberCategory));
    if (available.length === 0) return;
    setForm((f) => ({
      ...f,
      additionalRoles: [...f.additionalRoles, { category: available[0].value as MemberCategory, role: '' }],
    }));
  }

  function updateAdditionalRole(index: number, field: 'category' | 'role', value: string) {
    setForm((f) => ({
      ...f,
      additionalRoles: f.additionalRoles.map((r, i) =>
        i === index ? { ...r, [field]: field === 'category' ? (value as MemberCategory) : value } : r
      ),
    }));
  }

  function removeAdditionalRole(index: number) {
    setForm((f) => ({ ...f, additionalRoles: f.additionalRoles.filter((_, i) => i !== index) }));
  }

  function memberRolesDisplay(m: Member): string {
    const parts = [m.role];
    m.additionalRoles?.forEach((r) => parts.push(`${r.role} (${CATEGORIES.find((c) => c.value === r.category)?.label ?? r.category})`));
    return parts.join('; ');
  }

  function memberCategoriesDisplay(m: Member): string {
    const cats = [CATEGORIES.find((c) => c.value === m.category)?.label ?? m.category];
    m.additionalRoles?.forEach((r) => cats.push(CATEGORIES.find((c) => c.value === r.category)?.label ?? r.category));
    return [...new Set(cats)].join(', ');
  }

  function openProfile(m: Member) {
    setViewing(m);
    setModal(null);
    setEditing(null);
  }

  function closeModal() {
    setModal(null);
    setEditing(null);
    setViewing(null);
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
          body: JSON.stringify({
          name: form.name,
          role: form.role,
          category: form.category,
          order: form.order,
          phone: form.phone,
          additionalRoles: form.additionalRoles.filter((r) => r.role.trim()),
        }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Erro ao atualizar');
        }
      } else {
        const res = await fetch('/api/members', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          name: form.name,
          role: form.role,
          category: form.category,
          order: form.order,
          phone: form.phone,
          additionalRoles: form.additionalRoles.filter((r) => r.role.trim()),
        }),
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
        Lista de membros do capítulo com foto, cargo e contato.
      </p>

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="py-3 px-4 text-slate-600 font-medium w-12">Foto</th>
                <th className="py-3 px-4 text-slate-600 font-medium">Nome</th>
                <th className="py-3 px-4 text-slate-600 font-medium">Cargo</th>
                <th className="py-3 px-4 text-slate-600 font-medium">Categoria</th>
                <th className="py-3 px-4 text-slate-600 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 shrink-0 relative">
                      {m.photo ? (
                        <Image src={m.photo} alt="" fill className="object-cover" unoptimized={m.photo?.includes('supabase')} />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                          {m.name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{m.name}</td>
                  <td className="py-3 px-4 text-blue-800 font-medium">{memberRolesDisplay(m)}</td>
                  <td className="py-3 px-4 text-slate-600">{memberCategoriesDisplay(m)}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openProfile(m)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Ver perfil
                      </button>
                      {canManage && (
                        <>
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
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {members.length === 0 && (
            <p className="py-8 text-center text-slate-500">Nenhum membro cadastrado.</p>
          )}
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-blue-800 mb-4 text-center">Perfil do Membro</h2>
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-slate-100 shrink-0 relative">
                {viewing.photo ? (
                  <Image src={viewing.photo} alt="" fill className="object-cover" unoptimized={viewing.photo?.includes('supabase')} />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-slate-400 text-2xl font-medium">
                    {viewing.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className="w-full space-y-2 text-center">
                <p className="font-semibold text-slate-800 text-lg">{viewing.name}</p>
                <p className="text-blue-800 font-medium">{memberRolesDisplay(viewing)}</p>
                <p className="text-slate-600 text-sm">{memberCategoriesDisplay(viewing)}</p>
                {viewing.phone && (
                  <p className="text-slate-600 text-sm">
                    <span className="text-slate-500">Telefone:</span> {viewing.phone}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="w-full py-2 border border-slate-300 rounded-lg text-slate-700"
              >
                Fechar
              </button>
            </div>
          </div>
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
                <label className="block text-slate-700 text-sm mb-1">Categoria principal *</label>
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
                <label className="block text-slate-700 text-sm mb-1">Outras categorias/cargos (ex.: também Consultor)</label>
                <p className="text-slate-500 text-xs mb-2">Quem é de mais de uma categoria (ex.: Sênior + Consultor) adiciona aqui, sem duplicar a pessoa.</p>
                {form.additionalRoles.map((r, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select
                      value={r.category}
                      onChange={(e) => updateAdditionalRole(i, 'category', e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      {CATEGORIES.filter(
                        (c) =>
                          c.value === r.category ||
                          (c.value !== form.category && !form.additionalRoles.some((o, j) => j !== i && o.category === c.value))
                      ).map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={r.role}
                      onChange={(e) => updateAdditionalRole(i, 'role', e.target.value)}
                      placeholder="Cargo"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                    />
                    <button type="button" onClick={() => removeAdditionalRole(i)} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded">×</button>
                  </div>
                ))}
                {form.additionalRoles.length < CATEGORIES.length - 1 && (
                  <button type="button" onClick={addAdditionalRole} className="text-sm text-blue-600 hover:underline">
                    + Adicionar outra categoria/cargo
                  </button>
                )}
              </div>
              <div>
                <label className="block text-slate-700 text-sm mb-1">Telefone (opcional)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  placeholder="(00) 00000-0000"
                />
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
