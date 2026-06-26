'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Member, RollCall, MeetingType } from '@/types';
import { PanelAccessGate } from '@/components/PanelAccessGate';
import { ROLL_CALL_VIEWER_ROLES } from '@/lib/panel-permissions';
import {
  MEETING_TYPES,
  MEETING_TYPE_LABELS,
  MEETING_TYPE_DESCRIPTIONS,
  getDefaultAttendancePool,
  getMembersForMeetingType,
  isAdministrativaDefaultEligible,
} from '@/lib/meeting-attendance';
import { formatGestaoLabel, gestaoFromDate, listGestaoKeysFromMeetings, normalizeGestaoKey } from '@/lib/gestao';

const CATEGORY_ORDER = ['demolays', 'seniores', 'consultores', 'escudeiros'] as const;
type ChamadaCategory = (typeof CATEGORY_ORDER)[number];

const CATEGORY_LABELS: Record<string, string> = {
  demolays: 'DeMolays ativos',
  seniores: 'Sêniores ativos',
  consultores: 'Consultores / Tios maçons',
  escudeiros: 'Escudeiros',
};

type ChamadaEntry = { memberId: string; name: string; role: string; alsoIn?: string; guest?: boolean };

function memberChamadaCategories(m: Member): ChamadaCategory[] {
  const set = new Set<ChamadaCategory>();
  const primary = (m.category || 'demolays') as ChamadaCategory;
  if (CATEGORY_ORDER.includes(primary)) set.add(primary);
  (m.additionalRoles || []).forEach((r) => {
    const cat = r.category as ChamadaCategory;
    if (CATEGORY_ORDER.includes(cat)) set.add(cat);
  });
  return CATEGORY_ORDER.filter((c) => set.has(c));
}

function chamadaCategoryForMember(m: Member): ChamadaCategory {
  return memberChamadaCategories(m)[0] ?? 'demolays';
}

function roleInChamadaCategory(m: Member, cat: ChamadaCategory): string {
  if (m.category === cat) return m.role;
  return m.additionalRoles?.find((r) => r.category === cat)?.role ?? m.role;
}

function otherChamadaCategoriesLabel(m: Member, assigned: ChamadaCategory): string | undefined {
  const others = memberChamadaCategories(m).filter((c) => c !== assigned);
  if (others.length === 0) return undefined;
  return others.map((c) => CATEGORY_LABELS[c]).join(', ');
}

function formatDateBR(dateStr: string) {
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function meetingLabel(meeting: RollCall): string {
  if (meeting.title?.trim()) return meeting.title.trim();
  return `Reunião ${formatDateBR(meeting.date)}`;
}

function groupMeetingsByGestao(meetings: RollCall[]) {
  const map = new Map<string, RollCall[]>();
  for (const meeting of meetings) {
    const key = normalizeGestaoKey(meeting.date, meeting.gestao);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(meeting);
  }
  for (const items of map.values()) {
    items.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.startTime || '').localeCompare(a.startTime || ''));
  }
  return listGestaoKeysFromMeetings(meetings).map((gestao) => ({
    gestao,
    items: map.get(gestao) || [],
  }));
}

const emptyForm = {
  title: '',
  description: '',
  date: '',
  startTime: '',
  endTime: '',
  gestao: '',
};

export default function PainelFrequenciaPage() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [meetings, setMeetings] = useState<RollCall[]>([]);
  const [activeType, setActiveType] = useState<MeetingType>('ritualistica');
  const [loadingList, setLoadingList] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [selectedCategory, setSelectedCategory] = useState<ChamadaCategory | ''>('');
  const [downloadingModelo, setDownloadingModelo] = useState(false);

  const canEdit = user?.role && ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao'].includes(user.role);

  async function getAuthHeaders(): Promise<HeadersInit> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
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

  const loadMembers = useCallback(() => {
    setLoading(true);
    fetch('/api/members')
      .then((r) => r.json())
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  const loadMeetings = useCallback(() => {
    setLoadingList(true);
    getAuthHeaders()
      .then((headers) => fetch(`/api/roll-calls?meetingType=${activeType}`, { headers }))
      .then((r) => {
        if (!r.ok) throw new Error('Erro ao carregar reuniões');
        return r.json();
      })
      .then((data) => setMeetings(Array.isArray(data) ? data : []))
      .catch(() => setMeetings([]))
      .finally(() => setLoadingList(false));
  }, [activeType]);

  useEffect(() => { loadMembers(); }, [loadMembers]);
  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('chamada-rollcalls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roll_calls' }, () => loadMeetings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadMeetings]);

  const poolMembers = useMemo(
    () => getMembersForMeetingType(members, activeType),
    [members, activeType]
  );

  const byCategory = useMemo(() => {
    const entriesByCategory: Record<string, ChamadaEntry[]> = {
      demolays: [], seniores: [], consultores: [], escudeiros: [],
    };
    poolMembers.forEach((m) => {
      const cat = chamadaCategoryForMember(m);
      if (!entriesByCategory[cat]) entriesByCategory[cat] = [];
      const guest = activeType === 'administrativa' && !isAdministrativaDefaultEligible(m);
      entriesByCategory[cat].push({
        memberId: m.id,
        name: m.name,
        role: roleInChamadaCategory(m, cat),
        alsoIn: otherChamadaCategoriesLabel(m, cat),
        guest,
      });
    });
    for (const cat of CATEGORY_ORDER) {
      entriesByCategory[cat]?.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }
    return entriesByCategory;
  }, [poolMembers, activeType]);

  const categoriesWithMembers = useMemo(
    () => CATEGORY_ORDER.filter((cat) => (byCategory[cat]?.length ?? 0) > 0),
    [byCategory]
  );

  const grouped = useMemo(() => groupMeetingsByGestao(meetings), [meetings]);
  const showingDetail = !!selectedMeetingId || showNewForm;

  useEffect(() => {
    if (!showingDetail) return;
    if (categoriesWithMembers.length === 0) {
      setSelectedCategory('');
      return;
    }
    setSelectedCategory((current) =>
      current && categoriesWithMembers.includes(current) ? current : categoriesWithMembers[0]
    );
  }, [showingDetail, categoriesWithMembers]);

  function resetEditor() {
    setSelectedMeetingId(null);
    setShowNewForm(false);
    setForm(emptyForm);
    setAttendance({});
    setSelectedCategory('');
    setError('');
  }

  function startNewMeeting() {
    const today = new Date().toISOString().slice(0, 10);
    const initial: Record<string, boolean> = {};
    getDefaultAttendancePool(members, activeType).forEach((m) => { initial[m.id] = false; });
    setSelectedMeetingId(null);
    setShowNewForm(true);
    setForm({
      title: '',
      description: '',
      date: today,
      startTime: '',
      endTime: '',
      gestao: gestaoFromDate(today),
    });
    setAttendance(initial);
    setSelectedCategory('');
  }

  function openMeeting(meeting: RollCall) {
    setShowNewForm(false);
    setSelectedMeetingId(meeting.id);
    setForm({
      title: meeting.title || '',
      description: meeting.description || meeting.breveDescricao || '',
      date: meeting.date,
      startTime: meeting.startTime || '',
      endTime: meeting.endTime || '',
      gestao: normalizeGestaoKey(meeting.date, meeting.gestao),
    });
    setAttendance({ ...(meeting.attendance || {}) });
    setSelectedCategory('');
  }

  function setPresence(memberId: string, present: boolean) {
    if (!canEdit) return;
    setAttendance((prev) => ({ ...prev, [memberId]: present }));
  }

  async function handleDownloadModelo() {
    setDownloadingModelo(true);
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/frequencia-modelo', { headers });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Erro ao baixar.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pautas_e_frequencia.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao baixar modelo');
    } finally {
      setDownloadingModelo(false);
    }
  }

  async function handleSave() {
    if (!form.date) {
      setError('Informe a data da reunião.');
      return;
    }
    if (!form.title.trim() && activeType !== 'ritualistica') {
      setError('Informe o nome do evento.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/roll-calls', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          id: selectedMeetingId || undefined,
          date: form.date,
          attendance,
          gestao: form.gestao || gestaoFromDate(form.date),
          meetingType: activeType,
          title: form.title.trim() || undefined,
          description: form.description.trim() || undefined,
          startTime: form.startTime.trim() || undefined,
          endTime: form.endTime.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      loadMeetings();
      setShowNewForm(false);
      openMeeting(data as RollCall);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedMeetingId || !canEdit) return;
    if (!window.confirm('Excluir esta reunião e suas presenças?')) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/roll-calls/${selectedMeetingId}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Erro ao excluir');
      resetEditor();
      loadMeetings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const activeList = selectedCategory ? byCategory[selectedCategory] || [] : [];
  const totalPresent = Object.entries(attendance).filter(([id, present]) => present && poolMembers.some((m) => m.id === id)).length;
  const totalMarked = poolMembers.length;

  return (
    <PanelAccessGate role={user?.role} allowed={ROLL_CALL_VIEWER_ROLES} loading={!user}>
      <div className="max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-blue-800">Frequência</h1>
          <p className="text-slate-500 text-sm mt-1">
            Controle presenças em reuniões ritualísticas, administrativas e de controle.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {MEETING_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => { setActiveType(type); resetEditor(); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                activeType === type
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300'
              }`}
            >
              {MEETING_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        <p className="text-slate-600 text-sm mb-4">{MEETING_TYPE_DESCRIPTIONS[activeType]}</p>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Reuniões cadastradas</h2>
            {canEdit && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={startNewMeeting}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                >
                  + Nova reunião
                </button>
                {activeType === 'ritualistica' && (
                  <button
                    type="button"
                    onClick={handleDownloadModelo}
                    disabled={downloadingModelo}
                    className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {downloadingModelo ? 'Baixando...' : 'Modelo Excel'}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="p-4">
            {loadingList ? (
              <p className="text-slate-500 text-sm">Carregando...</p>
            ) : grouped.length === 0 ? (
              <p className="text-slate-500 text-sm">
                {canEdit ? 'Nenhuma reunião cadastrada neste tipo. Clique em "Nova reunião".' : 'Nenhuma reunião lançada ainda.'}
              </p>
            ) : (
              <div className="space-y-4">
                {grouped.map(({ gestao, items }) => (
                  <div key={gestao}>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                      Gestão {formatGestaoLabel(gestao)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {items.map((meeting) => {
                        const present = Object.values(meeting.attendance || {}).filter(Boolean).length;
                        const isSelected = selectedMeetingId === meeting.id && !showNewForm;
                        return (
                          <button
                            key={meeting.id}
                            type="button"
                            onClick={() => openMeeting(meeting)}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors text-left ${
                              isSelected
                                ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                                : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span>
                              <span className="font-medium block">{meetingLabel(meeting)}</span>
                              <span className={`text-xs ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                                {formatDateBR(meeting.date)}
                                {meeting.startTime ? ` · ${meeting.startTime}` : ''}
                              </span>
                            </span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${
                              isSelected ? 'bg-blue-500 text-blue-50' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {present} presentes
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {canEdit && showingDetail && (
            <div className="px-4 py-4 bg-slate-50 border-t border-slate-100 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 text-xs font-medium mb-1">Nome do evento</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder={activeType === 'ritualistica' ? 'Opcional para ritualísticas' : 'Ex.: Reunião administrativa de março'}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 text-xs font-medium mb-1">Descrição</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-xs font-medium mb-1">Data</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({
                      ...f,
                      date: e.target.value,
                      gestao: gestaoFromDate(e.target.value),
                    }))}
                    max={today}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-xs font-medium mb-1">Gestão</label>
                  <input
                    type="text"
                    value={form.gestao}
                    onChange={(e) => setForm((f) => ({ ...f, gestao: e.target.value }))}
                    placeholder="2026/2"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-xs font-medium mb-1">Início</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 text-xs font-medium mb-1">Término</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                {form.date && totalMarked > 0 && (
                  <p className="text-sm text-slate-600">
                    <span className="font-semibold text-green-700">{totalPresent}</span>
                    <span className="text-slate-400"> / {totalMarked} presentes</span>
                  </p>
                )}
                <div className="flex gap-2 ml-auto">
                  <button type="button" onClick={resetEditor} className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-white">
                    Cancelar
                  </button>
                  {selectedMeetingId && (
                    <button type="button" onClick={handleDelete} className="px-3 py-2 text-sm border border-red-200 rounded-lg text-red-600 hover:bg-red-50">
                      Excluir
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !form.date}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {!canEdit && (
          <p className="text-slate-500 text-sm mb-4">Somente escrivão, MC, 1º Conselheiro e admin podem editar frequências.</p>
        )}

        {loading ? (
          <p className="text-slate-500">Carregando membros...</p>
        ) : !showingDetail ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
            <p className="text-slate-500 text-sm">
              {canEdit
                ? 'Escolha uma reunião no histórico ou crie uma nova.'
                : 'Escolha uma reunião no histórico para ver os presentes.'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {activeType === 'administrativa' && (
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 text-amber-900 text-sm">
                Por padrão aparecem diretoria, conselho consultivo e sêniores. DeMolays convidados estão marcados como convidado.
              </div>
            )}
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Categoria</p>
              <div className="flex flex-wrap gap-1.5">
                {categoriesWithMembers.map((cat) => {
                  const list = byCategory[cat] || [];
                  const present = list.filter((entry) => attendance[entry.memberId]).length;
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {CATEGORY_LABELS[cat] || cat}
                      <span className={`ml-1.5 tabular-nums ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>
                        {present}/{list.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedCategory && activeList.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {activeList.map((entry) => (
                  <li key={entry.memberId} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50/80">
                    <div className="min-w-0">
                      <span className="text-slate-800 font-medium">{entry.name}</span>
                      {entry.role && <span className="text-slate-500 text-sm ml-2">{entry.role}</span>}
                      {entry.guest && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Convidado</span>
                      )}
                      {entry.alsoIn && (
                        <span className="block text-slate-400 text-xs mt-0.5 truncate">Também: {entry.alsoIn}</span>
                      )}
                    </div>
                    {canEdit ? (
                      <div className="flex gap-1 shrink-0 p-0.5 bg-slate-100 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setPresence(entry.memberId, true)}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            attendance[entry.memberId] ? 'bg-green-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          Presente
                        </button>
                        <button
                          type="button"
                          onClick={() => setPresence(entry.memberId, false)}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            attendance[entry.memberId] === false ? 'bg-red-500 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
                          }`}
                        >
                          Ausente
                        </button>
                      </div>
                    ) : (
                      <span className={`text-sm font-medium shrink-0 ${attendance[entry.memberId] ? 'text-green-600' : 'text-slate-400'}`}>
                        {attendance[entry.memberId] ? 'Presente' : 'Ausente'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-slate-500 text-sm">Nenhum membro nesta categoria.</p>
            )}
          </div>
        )}
      </div>
    </PanelAccessGate>
  );
}
