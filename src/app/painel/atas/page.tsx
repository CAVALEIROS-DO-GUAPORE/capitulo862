'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { InternalMinutes, AtaType } from '@/types';
import type { Member } from '@/types';

const ATA_TYPES: { value: AtaType; label: string }[] = [
  { value: 'RITUALISTICA', label: 'Ritualística' },
  { value: 'ADMINISTRATIVA', label: 'Administrativa' },
  { value: 'EVENTO', label: 'Evento' },
  { value: 'OUTROS', label: 'Outros' },
];

const defaultForm = {
  title: '',
  content: '',
  status: 'rascunho' as 'rascunho' | 'publicada',
  date: new Date().toISOString().slice(0, 10),
  startTime: '',
  endTime: '',
  type: 'ADMINISTRATIVA' as AtaType,
  ourLodge: true,
  locationName: '',
  city: '',
  rollCallDate: '',
  presidingMc: '',
  presiding1c: '',
  presiding2c: '',
  tiosPresentes: [] as string[],
  trabalhosTexto: '',
  escrivaoName: '',
};

type FormState = typeof defaultForm;

export default function PainelAtasPage() {
  const [user, setUser] = useState<{ role: string; name?: string } | null>(null);
  const [minutes, setMinutes] = useState<InternalMinutes[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<InternalMinutes | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<InternalMinutes | null>(null);
  const [pullRollCallDate, setPullRollCallDate] = useState('');
  const [tioManual, setTioManual] = useState('');

  const canPost = user?.role && ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao'].includes(user.role);

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setUser(u);
      } catch {}
    }
  }, []);

  const loadMinutes = useCallback(function loadMinutes() {
    fetch('/api/minutes')
      .then((r) => r.json())
      .then((data) => setMinutes(Array.isArray(data) ? data : []))
      .catch(() => setMinutes([]))
      .finally(() => setLoading(false));
  }, []);

  const loadMembers = useCallback(() => {
    fetch('/api/members')
      .then((r) => r.json())
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]));
  }, []);

  useEffect(() => {
    loadMinutes();
    loadMembers();
  }, [loadMinutes, loadMembers]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('minutes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'minutes' }, () => loadMinutes())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadMinutes]);

  function openAdd() {
    setEditing(null);
    const escrivaoMember = members.find((m) =>
      m.category === 'demolays' && (m.role === 'Escrivão' || m.role === 'escrivao')
    );
    setForm({
      ...defaultForm,
      date: new Date().toISOString().slice(0, 10),
      escrivaoName: escrivaoMember?.name || '',
    });
    setModal('add');
    setError('');
  }

  async function openEdit(m: InternalMinutes) {
    setEditing(m);
    const res = await fetch(`/api/minutes/${m.id}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Erro ao carregar ata');
      return;
    }
    const mm = data as InternalMinutes;
    const escrivaoMember = members.find((m) =>
      m.category === 'demolays' && (m.role === 'Escrivão' || m.role === 'escrivao')
    );
    setForm({
      title: mm.title || '',
      content: mm.content || '',
      status: (mm.status || 'rascunho') as 'rascunho' | 'publicada',
      date: mm.date || new Date().toISOString().slice(0, 10),
      startTime: mm.startTime || '',
      endTime: mm.endTime || '',
      type: (mm.type || 'ADMINISTRATIVA') as AtaType,
      ourLodge: mm.ourLodge !== false,
      locationName: mm.locationName || '',
      city: mm.city || '',
      rollCallDate: mm.rollCallDate || '',
      presidingMc: mm.presidingMc || '',
      presiding1c: mm.presiding1c || '',
      presiding2c: mm.presiding2c || '',
      tiosPresentes: Array.isArray(mm.tiosPresentes) ? mm.tiosPresentes : [],
      trabalhosTexto: mm.trabalhosTexto || '',
      escrivaoName: mm.escrivaoName || escrivaoMember?.name || '',
    });
    setModal('edit');
    setError('');
  }

  function closeModal() {
    setModal(null);
    setEditing(null);
  }

  function normalizeDateForApi(dateStr: string): string {
    const t = dateStr.trim();
    if (!t) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    const ddmmyy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyy) {
      const [, d, m, y] = ddmmyy;
      return `${y}-${m!.padStart(2, '0')}-${d!.padStart(2, '0')}`;
    }
    return t;
  }

  function findMemberByRole(mems: Member[], roleLabels: string[], category: string): Member | undefined {
    return mems.find((m) => m.category === category && roleLabels.some((r) => r === m.role || r.toLowerCase().replace(/\s/g, '_') === m.role));
  }

  async function pullFromRollCall() {
    const rawDate = pullRollCallDate || form.rollCallDate;
    if (!rawDate?.trim()) {
      setError('Informe a data da chamada para puxar os presentes.');
      return;
    }
    const date = normalizeDateForApi(rawDate);
    setError('');
    try {
      const [rollRes, membersRes] = await Promise.all([
        fetch(`/api/roll-calls?date=${encodeURIComponent(date)}`),
        fetch('/api/members'),
      ]);
      const roll = rollRes.ok ? await rollRes.json() : null;
      const mems = (await membersRes.json()) as Member[];
      const attendance = (roll && typeof roll.attendance === 'object' ? roll.attendance : {}) as Record<string, boolean>;

      const presidingMc = findMemberByRole(mems, ['Mestre Conselheiro', 'mestre_conselheiro'], 'demolays')?.name ?? '';
      const presiding1c = findMemberByRole(mems, ['1º Conselheiro', 'primeiro_conselheiro'], 'demolays')?.name ?? '';
      const presiding2c = findMemberByRole(mems, ['2º Conselheiro', 'segundo_conselheiro'], 'demolays')?.name ?? '';
      const escrivaoMember = findMemberByRole(mems, ['Escrivão', 'escrivao'], 'demolays');
      const tiosFromCall = mems
        .filter((m) => m.category === 'consultores' && attendance[m.id])
        .map((m) => m.name);

      setForm((f) => ({
        ...f,
        rollCallDate: date,
        presidingMc,
        presiding1c,
        presiding2c,
        escrivaoName: escrivaoMember?.name ?? f.escrivaoName,
        tiosPresentes: roll ? tiosFromCall : f.tiosPresentes,
      }));
      setPullRollCallDate('');
    } catch {
      setError('Erro ao puxar dados da chamada.');
    }
  }

  function addTioManual() {
    const name = tioManual.trim();
    if (!name) return;
    setForm((f) => ({
      ...f,
      tiosPresentes: f.tiosPresentes.includes(name) ? f.tiosPresentes : [...f.tiosPresentes, name],
    }));
    setTioManual('');
  }

  function removeTio(name: string) {
    setForm((f) => ({ ...f, tiosPresentes: f.tiosPresentes.filter((n) => n !== name) }));
  }

  async function handleSubmit(e: React.FormEvent, publish: boolean) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      ...form,
      status: publish ? 'publicada' : 'rascunho',
    };
    try {
      if (editing) {
        const res = await fetch(`/api/minutes/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Erro ao atualizar');
        }
      } else {
        const res = await fetch('/api/minutes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Erro ao salvar');
        }
      }
      loadMinutes();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta ata?')) return;
    try {
      const res = await fetch(`/api/minutes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      loadMinutes();
      setViewing(null);
    } catch {
      alert('Erro ao excluir');
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const sorted = [...minutes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const ataLabel = (m: InternalMinutes) => {
    if (m.status === 'publicada' && m.ataNumber != null && m.ataYear != null) {
      return `ATA nº ${String(m.ataNumber).padStart(3, '0')} / ${m.ataYear}`;
    }
    return 'Rascunho';
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Atas</h1>
        {canPost && (
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            + Nova Ata
          </button>
        )}
      </div>
      <p className="text-slate-600 mb-6">
        Atas das reuniões. Salve como rascunho para editar depois ou publique para que todos os membros possam ver e baixar em PDF.
      </p>

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            {sorted.map((m) => (
              <div
                key={m.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  viewing?.id === m.id
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-slate-200 hover:border-blue-200'
                }`}
                onClick={() => setViewing(m)}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-slate-500">{ataLabel(m)}</span>
                  {m.status === 'rascunho' && (
                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Rascunho</span>
                  )}
                </div>
                <h3 className="font-bold text-blue-800">{m.title}</h3>
                <p className="text-slate-500 text-sm">{formatDate(m.createdAt)}</p>
              </div>
            ))}
            {minutes.length === 0 && (
              <p className="py-8 text-center text-slate-500 bg-white rounded-lg border">Nenhuma ata.</p>
            )}
          </div>

          <div>
            {viewing ? (
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <div>
                    <span className="text-sm text-slate-500">{ataLabel(viewing)}</span>
                    <h2 className="text-lg font-bold text-blue-800">{viewing.title}</h2>
                  </div>
                  {canPost && (viewing.status === 'rascunho' || !viewing.status) && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => openEdit(viewing)}
                        className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(viewing.id)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-slate-500 text-sm mb-4">{formatDate(viewing.createdAt)}</p>
                <div className="text-slate-700 whitespace-pre-wrap">{viewing.content}</div>
                {viewing.status === 'publicada' && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <a
                      href={`/api/minutes/${viewing.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                    >
                      Baixar PDF
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-8 text-center text-slate-500">
                Selecione uma ata para visualizar.
              </div>
            )}
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-blue-800 mb-4">
              {editing ? 'Editar Ata' : 'Nova Ata'}
            </h2>
            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
              <div>
                <label className="block text-slate-700 text-sm mb-1">Título *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 text-sm mb-1">Data da reunião *</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 text-sm mb-1">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AtaType }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {ATA_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 text-sm mb-1">Hora início</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 text-sm mb-1">Hora término</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ourLodge"
                  checked={form.ourLodge}
                  onChange={(e) => setForm((f) => ({ ...f, ourLodge: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                <label htmlFor="ourLodge" className="text-slate-700 text-sm">Foi na nossa loja? (Augusta e Respeitável Loja Maçônica Estrela do Guaporé nº 63)</label>
              </div>
              {!form.ourLodge && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 text-sm mb-1">Local</label>
                    <input
                      type="text"
                      value={form.locationName}
                      onChange={(e) => setForm((f) => ({ ...f, locationName: e.target.value }))}
                      placeholder="Nome do local"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 text-sm mb-1">Cidade</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                      placeholder="Cidade"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4">
                <label className="block text-slate-700 text-sm mb-2">Puxar presentes da chamada</label>
                <div className="flex gap-2 flex-wrap items-center">
                  <input
                    type="date"
                    value={pullRollCallDate || form.rollCallDate}
                    onChange={(e) => setPullRollCallDate(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={pullFromRollCall}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm"
                  >
                    Puxar presença e presidência
                  </button>
                </div>
                <p className="text-slate-500 text-xs mt-1">Selecione a data da chamada e clique para preencher presidência e tios presentes.</p>
              </div>

              <div>
                <label className="block text-slate-700 text-sm mb-1">Presidência</label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={form.presidingMc}
                    onChange={(e) => setForm((f) => ({ ...f, presidingMc: e.target.value }))}
                    placeholder="Mestre Conselheiro"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={form.presiding1c}
                    onChange={(e) => setForm((f) => ({ ...f, presiding1c: e.target.value }))}
                    placeholder="1º Conselheiro"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="text"
                    value={form.presiding2c}
                    onChange={(e) => setForm((f) => ({ ...f, presiding2c: e.target.value }))}
                    placeholder="2º Conselheiro"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 text-sm mb-1">Tios presentes</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tioManual}
                    onChange={(e) => setTioManual(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTioManual())}
                    placeholder="Adicionar nome"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <button type="button" onClick={addTioManual} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm">
                    +
                  </button>
                </div>
                {form.tiosPresentes.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {form.tiosPresentes.map((n) => (
                      <li key={n} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-sm">
                        {n}
                        {canPost && (
                          <button type="button" onClick={() => removeTio(n)} className="text-red-600 hover:underline">×</button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="block text-slate-700 text-sm mb-1">Os trabalhos no grau... (ex.: grau iniciático, cerimônia pública, reunião administrativa)</label>
                <input
                  type="text"
                  value={form.trabalhosTexto}
                  onChange={(e) => setForm((f) => ({ ...f, trabalhosTexto: e.target.value }))}
                  placeholder="ex.: grau iniciático começaram às 20h"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 text-sm mb-1">Escrivão (nome)</label>
                <input
                  type="text"
                  value={form.escrivaoName}
                  onChange={(e) => setForm((f) => ({ ...f, escrivaoName: e.target.value }))}
                  placeholder="Nome do escrivão"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 text-sm mb-1">Conteúdo / Acontecimentos da reunião *</label>
                <textarea
                  required
                  rows={8}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none"
                />
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-2 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar rascunho'}
                </button>
                {canPost && (
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Publicar'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
