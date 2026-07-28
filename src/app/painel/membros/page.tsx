'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useDialogs } from '@/components/DialogsProvider';
import MemberBadges from '@/components/MemberBadges';
import type { Member, MemberCategory, MemberAdditionalRole, MemberBadgeId } from '@/types';
import type { MemberBadgeDefinition } from '@/lib/member-badges';

const CATEGORIES = [
  { value: 'demolays', label: 'DeMolays' },
  { value: 'seniores', label: 'Sêniores' },
  { value: 'consultores', label: 'Consultores' },
  { value: 'escudeiros', label: 'Escudeiros' },
];

const ROLES_BY_CATEGORY: Record<string, string[]> = {
  demolays: ['Mestre Conselheiro', '1º Conselheiro', '2º Conselheiro', 'Escrivão', 'Hospitaleiro', 'Tesoureiro', 'Orador', 'Membro'],
  seniores: ['Presidente', 'Vice-Presidente', 'Secretário', 'Tesoureiro', 'Membro'],
  consultores: ['Presidente', 'Membro Organizador', 'Consultor', 'Membro'],
  escudeiros: ['Mestre Escudeiro', '1º Escudeiro', '2º Escudeiro', 'Escudeiro'],
};

type TabId = 'lista' | 'emblemas';

export default function PainelMembrosPage() {
  const { confirm, toast } = useDialogs();
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
    identifier: number;
    additionalRoles: MemberAdditionalRole[];
  }>({
    name: '',
    role: '',
    category: 'demolays',
    order: 0,
    phone: '',
    identifier: 0,
    additionalRoles: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('lista');
  const [canManageBadges, setCanManageBadges] = useState(false);
  const [badgeCatalog, setBadgeCatalog] = useState<MemberBadgeDefinition[]>([]);
  const [badgeMemberId, setBadgeMemberId] = useState('');
  const [selectedBadges, setSelectedBadges] = useState<MemberBadgeId[]>([]);
  const [badgeSaving, setBadgeSaving] = useState(false);
  const canManage = user?.role && ['admin', 'mestre_conselheiro', 'primeiro_conselheiro'].includes(user.role);

  async function getAuthHeaders(): Promise<HeadersInit> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    return headers;
  }

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
    async function loadBadgePermissions() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/badges', { headers });
        if (!res.ok) return;
        const data = await res.json();
        setCanManageBadges(data.canManage === true);
        setBadgeCatalog(Array.isArray(data.badges) ? data.badges : []);
      } catch {}
    }
    loadBadgePermissions();
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('members-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => loadMembers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadMembers]);

  useEffect(() => {
    if (!badgeMemberId) {
      setSelectedBadges([]);
      return;
    }
    const member = members.find((m) => m.id === badgeMemberId);
    setSelectedBadges(member?.badges?.slice() ?? []);
  }, [badgeMemberId, members]);

  function openAdd() {
    setEditing(null);
    setViewing(null);
    setForm({ name: '', role: '', category: 'demolays', order: members.length + 1, phone: '', identifier: 0, additionalRoles: [] });
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
      identifier: m.identifier ?? 0,
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

  function toggleBadgeSelection(badgeId: MemberBadgeId) {
    setSelectedBadges((prev) =>
      prev.includes(badgeId) ? prev.filter((id) => id !== badgeId) : [...prev, badgeId]
    );
  }

  async function handleSaveBadges(e: React.FormEvent) {
    e.preventDefault();
    if (!badgeMemberId) {
      toast('Selecione um membro.', 'error');
      return;
    }
    setBadgeSaving(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/members/${badgeMemberId}/badges`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ badges: selectedBadges }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar emblemas');
      toast('Emblemas atualizados.', 'success');
      loadMembers();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar emblemas', 'error');
    } finally {
      setBadgeSaving(false);
    }
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
          identifier: form.identifier,
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
          identifier: form.identifier,
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
    const ok = await confirm({
      title: 'Excluir membro',
      message: 'Excluir este membro?',
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      loadMembers();
      toast('Membro excluído.', 'success');
    } catch {
      toast('Erro ao excluir.', 'error');
    }
  }

  const sortedMembers = [...members].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Gerenciar Membros</h1>
        {canManage && activeTab === 'lista' && (
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            + Cadastrar Membro
          </button>
        )}
      </div>

      {canManageBadges && (
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('lista')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'lista'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-blue-600'
            }`}
          >
            Lista de Membros
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('emblemas')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === 'emblemas'
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-600 hover:text-blue-600'
            }`}
          >
            Dar Emblema
          </button>
        </div>
      )}

      {activeTab === 'lista' && (
        <>
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
                    <th className="py-3 px-4 text-slate-600 font-medium w-16">ID</th>
                    <th className="py-3 px-4 text-slate-600 font-medium">Nome</th>
                    <th className="py-3 px-4 text-slate-600 font-medium">Cargo</th>
                    <th className="py-3 px-4 text-slate-600 font-medium">Categoria</th>
                    <th className="py-3 px-4 text-slate-600 font-medium">Emblemas</th>
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
                      <td className="py-3 px-4 text-slate-600 tabular-nums">{m.identifier ?? 0}</td>
                      <td className="py-3 px-4 text-slate-700">{m.name}</td>
                      <td className="py-3 px-4 text-blue-800 font-medium">{memberRolesDisplay(m)}</td>
                      <td className="py-3 px-4 text-slate-600">{memberCategoriesDisplay(m)}</td>
                      <td className="py-3 px-4">
                        <MemberBadges badges={m.badges} size="sm" className="justify-start" />
                      </td>
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
        </>
      )}

      {activeTab === 'emblemas' && canManageBadges && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm max-w-2xl">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Conceder emblemas</h2>
          <p className="text-slate-600 text-sm mb-6">
            Selecione o membro e marque os emblemas que ele possui. Disponível para admin e membros do Conselho Consultivo.
          </p>
          <form onSubmit={handleSaveBadges} className="space-y-6">
            <div>
              <label className="block text-slate-700 text-sm mb-1">Membro</label>
              <select
                value={badgeMemberId}
                onChange={(e) => setBadgeMemberId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="">Selecione um membro...</option>
                {sortedMembers.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {badgeMemberId && (
              <div>
                <p className="text-slate-700 text-sm mb-3">Emblemas</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {badgeCatalog.map((badge) => {
                    const checked = selectedBadges.includes(badge.id);
                    return (
                      <label
                        key={badge.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          checked ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBadgeSelection(badge.id)}
                          className="mt-1"
                        />
                        <span className="relative w-10 h-10 shrink-0 rounded-md overflow-hidden ring-1 ring-slate-200 bg-white">
                          <Image src={badge.image} alt="" fill className="object-contain p-0.5" sizes="40px" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-slate-800 text-sm">{badge.label}</span>
                          <span className="block text-slate-500 text-xs">{badge.description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {selectedBadges.length > 0 && (
                  <div className="mt-4">
                    <p className="text-slate-600 text-sm mb-2">Pré-visualização</p>
                    <MemberBadges badges={selectedBadges} size="md" className="justify-start" />
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={badgeSaving || !badgeMemberId}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {badgeSaving ? 'Salvando...' : 'Salvar emblemas'}
            </button>
          </form>
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
                {viewing.badges && viewing.badges.length > 0 && (
                  <div className="pt-1">
                    <p className="text-slate-500 text-xs mb-2">Emblemas</p>
                    <MemberBadges badges={viewing.badges} size="md" />
                  </div>
                )}
                {(viewing.identifier ?? 0) !== 0 && (
                  <p className="text-slate-600 text-sm">
                    <span className="text-slate-500">ID:</span> {viewing.identifier}
                  </p>
                )}
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
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[92vh] flex flex-col">
            <div className="px-4 pt-4 pb-2 shrink-0 border-b border-slate-100">
              <h2 className="text-base font-bold text-blue-800">
                {editing ? 'Editar Membro' : 'Cadastrar Membro'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
              <div className="px-4 py-3 overflow-y-auto space-y-3 flex-1">
                <div>
                  <label className="block text-slate-700 text-xs font-medium mb-1">Nome *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 text-xs font-medium mb-1">Categoria *</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Member['category'] }))}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 text-xs font-medium mb-1">Cargo *</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg"
                      required
                    >
                      <option value="">Selecione</option>
                      {[
                        ...(form.role && !(ROLES_BY_CATEGORY[form.category] ?? []).includes(form.role) ? [form.role] : []),
                        ...(ROLES_BY_CATEGORY[form.category] ?? []),
                      ].map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {form.role && !(ROLES_BY_CATEGORY[form.category] ?? []).includes(form.role) && (
                  <p className="text-amber-600 text-xs -mt-1">Use &quot;1º Conselheiro&quot; ou &quot;2º Conselheiro&quot; para aparecer na diretoria.</p>
                )}
                <div>
                  <label className="block text-slate-700 text-xs font-medium mb-1">Outras categorias/cargos</label>
                  <p className="text-slate-500 text-xs mb-1.5">Ex.: Sênior que também é Consultor.</p>
                  {form.additionalRoles.map((r, i) => (
                    <div key={i} className="flex gap-1.5 mb-1.5">
                      <select
                        value={r.category}
                        onChange={(e) => updateAdditionalRole(i, 'category', e.target.value)}
                        className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
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
                        className="flex-1 min-w-0 px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                      />
                      <button type="button" onClick={() => removeAdditionalRole(i)} className="px-2 text-red-600 hover:bg-red-50 rounded shrink-0">×</button>
                    </div>
                  ))}
                  {form.additionalRoles.length < CATEGORIES.length - 1 && (
                    <button type="button" onClick={addAdditionalRole} className="text-xs text-blue-600 hover:underline">
                      + Outra categoria/cargo
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-700 text-xs font-medium mb-1">ID</label>
                    <input
                      type="number"
                      min={0}
                      value={form.identifier}
                      onChange={(e) => setForm((f) => ({ ...f, identifier: parseInt(e.target.value, 10) || 0 }))}
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                      placeholder="0"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Único por membro. Use 0 se ainda não tiver ID.
                    </p>
                  </div>
                  <div>
                    <label className="block text-slate-700 text-xs font-medium mb-1">Ordem</label>
                    <input
                      type="number"
                      min={1}
                      value={form.order}
                      onChange={(e) => setForm((f) => ({ ...f, order: parseInt(e.target.value) || 1 }))}
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-slate-700 text-xs font-medium mb-1">Telefone (opcional)</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-lg"
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                {error && <p className="text-red-600 text-xs">{error}</p>}
              </div>
              <div className="px-4 py-3 border-t border-slate-100 shrink-0 flex gap-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 text-sm border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
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
