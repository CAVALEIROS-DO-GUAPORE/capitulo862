'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDialogs } from '@/components/DialogsProvider';
import type { InternalMinutes, AtaType } from '@/types';
import type { Member } from '@/types';

const ATA_TYPES: { value: AtaType; label: string }[] = [
  { value: 'RITUALISTICA', label: 'Ritualística' },
  { value: 'ADMINISTRATIVA', label: 'Administrativa' },
  { value: 'EVENTO', label: 'Evento' },
  { value: 'OUTROS', label: 'Outros' },
];

const LOCAL_CAPITULO = 'Augusta e Respeitável Loja Simbólica Estrela do Guaporé nº 63 na cidade de Pontes e Lacerda - MT';

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
  ataGestao: '',
  tioConselho: '',
  palavraSecreta: '',
  pauta: '',
};

type FormState = typeof defaultForm;

export default function PainelAtasPage() {
  const { confirm, toast } = useDialogs();
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
    const presidingMc = findMemberByRole(members, ['Mestre Conselheiro', 'mestre_conselheiro'], 'demolays')?.name ?? '';
    const presiding1c = findMemberByRole(members, ['1º Conselheiro', 'primeiro_conselheiro'], 'demolays')?.name ?? '';
    const presiding2c = findMemberByRole(members, ['2º Conselheiro', 'segundo_conselheiro'], 'demolays')?.name ?? '';
    const escrivaoMember = findMemberByRole(members, ['Escrivão', 'escrivao'], 'demolays');
    setForm({
      ...defaultForm,
      date: new Date().toISOString().slice(0, 10),
      presidingMc,
      presiding1c,
      presiding2c,
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
      ataGestao: mm.ataGestao || '',
      tioConselho: mm.tioConselho || '',
      palavraSecreta: mm.palavraSecreta || '',
      pauta: mm.pauta || '',
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

  /** Preenche MC, 1ºC, 2ºC e Escrivão a partir dos cargos atuais dos membros (editável depois). */
  function fillPresidencyFromCurrentRoles() {
    const presidingMc = findMemberByRole(members, ['Mestre Conselheiro', 'mestre_conselheiro'], 'demolays')?.name ?? '';
    const presiding1c = findMemberByRole(members, ['1º Conselheiro', 'primeiro_conselheiro'], 'demolays')?.name ?? '';
    const presiding2c = findMemberByRole(members, ['2º Conselheiro', 'segundo_conselheiro'], 'demolays')?.name ?? '';
    const escrivaoName = findMemberByRole(members, ['Escrivão', 'escrivao'], 'demolays')?.name ?? '';
    setForm((f) => ({
      ...f,
      presidingMc,
      presiding1c,
      presiding2c,
      escrivaoName: escrivaoName || f.escrivaoName,
    }));
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
      ataGestao: form.ataGestao || undefined,
      tioConselho: form.tioConselho || undefined,
      palavraSecreta: form.palavraSecreta || undefined,
      pauta: form.pauta || undefined,
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
      toast(publish ? 'Ata publicada.' : 'Rascunho salvo.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Excluir ata',
      message: 'Excluir esta ata? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/minutes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      loadMinutes();
      setViewing(null);
      toast('Ata excluída.', 'success');
    } catch {
      toast('Erro ao excluir.', 'error');
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
      <p className="text-slate-600 mb-4">
        Atas das reuniões. Salve como rascunho para editar depois ou publique para que todos vejam. Quem tem carga de Escrivão, MC, 1ºC ou Admin pode editar e excluir.
      </p>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <a
          href="/atareuniao.docx"
          download="atareuniao.docx"
          className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
        >
          Baixar modelo de ata (Word)
        </a>
        <a
          href="/atareuniao.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
        >
          Ver modelo (PDF)
        </a>
      </div>

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
                  {canPost && (
                    <div className="flex gap-2 shrink-0 flex-wrap">
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
                      {viewing.status === 'publicada' && (
                        <a
                          href={`/api/minutes/${viewing.id}/word`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                        >
                          Baixar em Word
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-slate-500 text-sm mb-4">{formatDate(viewing.createdAt)}</p>
                <div className="text-slate-700 whitespace-pre-wrap">{viewing.content}</div>
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

              <div>
                <label className="block text-slate-700 text-sm mb-1">Local da reunião</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.ourLodge ? LOCAL_CAPITULO : form.locationName}
                    onChange={(e) => setForm((f) => ({ ...f, ourLodge: false, locationName: e.target.value }))}
                    placeholder="Digite o local ou clique em CAPÍTULO"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, ourLodge: true, locationName: LOCAL_CAPITULO }))}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium whitespace-nowrap"
                  >
                    CAPÍTULO
                  </button>
                </div>
                <p className="text-slate-500 text-xs mt-1">Preencha manualmente ou use CAPÍTULO para o endereço padrão.</p>
              </div>

              <div>
                <label className="block text-slate-700 text-sm mb-1">Gestão</label>
                <select
                  value={form.ataGestao}
                  onChange={(e) => setForm((f) => ({ ...f, ataGestao: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Selecione</option>
                  <option value="1">Gestão 1</option>
                  <option value="2">Gestão 2</option>
                </select>
                <p className="text-slate-500 text-xs mt-1">O escrivão define se é 1ª ou 2ª gestão.</p>
              </div>

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
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="block text-slate-700 text-sm">Presidência</label>
                  <button
                    type="button"
                    onClick={fillPresidencyFromCurrentRoles}
                    className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded"
                  >
                    Preencher com cargos atuais
                  </button>
                </div>
                <p className="text-slate-500 text-xs mb-2">MC, 1º e 2º Conselheiro são preenchidos automaticamente; edite aqui se alguém tiver sido substituído.</p>
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
                <label className="block text-slate-700 text-sm mb-1">Tio do Conselho (líder)</label>
                <select
                  value={form.tioConselho}
                  onChange={(e) => setForm((f) => ({ ...f, tioConselho: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="">Selecione um tio</option>
                  {form.tiosPresentes.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <p className="text-slate-500 text-xs mt-1">Escolha o tio que aparece como líder do conselho na ata.</p>
              </div>

              <div>
                <label className="block text-slate-700 text-sm mb-1">Pauta (tópicos discutidos)</label>
                <input
                  type="text"
                  value={form.pauta}
                  onChange={(e) => setForm((f) => ({ ...f, pauta: e.target.value }))}
                  placeholder="Ex.: Aprovação da ata anterior, Palavra do dia, Ordem do dia (separados por vírgula)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-slate-700 text-sm mb-1">Palavra secreta (opcional)</label>
                <input
                  type="text"
                  value={form.palavraSecreta}
                  onChange={(e) => setForm((f) => ({ ...f, palavraSecreta: e.target.value }))}
                  placeholder="Apenas em reunião ritualística"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
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
                <label className="block text-slate-700 text-sm mb-1">Bem da Ordem (descrição da reunião) *</label>
                <textarea
                  required
                  rows={8}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  placeholder="Descrição completa dos acontecimentos da reunião. Este texto preenche a tag {bemdaOrdem} no Word."
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
