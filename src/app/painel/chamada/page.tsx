'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Member, RollCall } from '@/types';

const CATEGORY_ORDER = ['demolays', 'seniores', 'consultores', 'escudeiros'] as const;
type ChamadaCategory = (typeof CATEGORY_ORDER)[number];

const CATEGORY_LABELS: Record<string, string> = {
  demolays: 'DeMolays ativos',
  seniores: 'Sêniores ativos',
  consultores: 'Consultores / Tios maçons',
  escudeiros: 'Escudeiros',
};

type ChamadaEntry = { memberId: string; name: string; role: string; alsoIn?: string };

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

/** Cada membro entra em uma única categoria na chamada (evita duplicidade sênior + consultor). */
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

/** Agrupa chamadas por ano e gestão. Retorna entradas ordenadas: ano desc, gestão 2 depois 1. */
function groupRollCallsByYearAndGestao(rollCalls: RollCall[]): { year: number; gestao: string; items: RollCall[] }[] {
  const map = new Map<string, RollCall[]>();
  for (const rc of rollCalls) {
    const year = rc.date ? parseInt(rc.date.slice(0, 4), 10) : new Date().getFullYear();
    const gestao = (rc.gestao || '').trim() || 'sem';
    const key = `${year}-${gestao}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(rc);
  }
  for (const arr of map.values()) {
    arr.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }
  const entries = Array.from(map.entries()).map(([key, items]) => {
    const [y, g] = key.split('-');
    return { year: parseInt(y, 10), gestao: g, items };
  });
  entries.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.gestao === 'sem' && b.gestao !== 'sem') return 1;
    if (a.gestao !== 'sem' && b.gestao === 'sem') return -1;
    return b.gestao.localeCompare(a.gestao);
  });
  return entries;
}

export default function PainelFrequenciaPage() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [rollCallsList, setRollCallsList] = useState<RollCall[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [rollCallDate, setRollCallDate] = useState('');
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [saveGestao, setSaveGestao] = useState('1');
  const [loading, setLoading] = useState(true);
  const [loadingRoll, setLoadingRoll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [downloadingModelo, setDownloadingModelo] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ChamadaCategory | ''>('');

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
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d?.error || 'Erro ao carregar membros'); });
        return r.json();
      })
      .then((data) => {
        setError('');
        setMembers(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar membros');
        setMembers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadRollCallsList = useCallback(() => {
    setLoadingList(true);
    fetch('/api/roll-calls')
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d?.error || 'Erro ao carregar chamadas'); });
        return r.json();
      })
      .then((data) => setRollCallsList(Array.isArray(data) ? data : []))
      .catch(() => setRollCallsList([]))
      .finally(() => setLoadingList(false));
  }, []);

  useEffect(() => {
    loadRollCallsList();
  }, [loadRollCallsList]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('chamada-members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, () => loadMembers())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadMembers]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('chamada-rollcalls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'roll_calls' }, () => loadRollCallsList())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadRollCallsList]);

  useEffect(() => {
    if (!rollCallDate) return;
    setLoadingRoll(true);
    setError('');
    fetch(`/api/roll-calls?date=${encodeURIComponent(rollCallDate)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.attendance === 'object') {
          setAttendance(data.attendance);
          if (data.gestao != null) setSaveGestao(String(data.gestao));
        } else {
          const initial: Record<string, boolean> = {};
          members.forEach((m) => { initial[m.id] = false; });
          setAttendance(initial);
        }
      })
      .catch(() => setAttendance({}))
      .finally(() => setLoadingRoll(false));
  }, [rollCallDate, members.length]);

  useEffect(() => {
    if (members.length && Object.keys(attendance).length === 0 && !loadingRoll && rollCallDate) {
      const initial: Record<string, boolean> = {};
      members.forEach((m) => { initial[m.id] = attendance[m.id] ?? false; });
      if (Object.keys(initial).length) setAttendance((prev) => ({ ...initial, ...prev }));
    }
  }, [members, loadingRoll, rollCallDate]);

  const byCategory = useMemo(() => {
    const entriesByCategory: Record<string, ChamadaEntry[]> = {
      demolays: [], seniores: [], consultores: [], escudeiros: [],
    };
    members.forEach((m) => {
      const cat = chamadaCategoryForMember(m);
      if (!entriesByCategory[cat]) entriesByCategory[cat] = [];
      entriesByCategory[cat].push({
        memberId: m.id,
        name: m.name,
        role: roleInChamadaCategory(m, cat),
        alsoIn: otherChamadaCategoriesLabel(m, cat),
      });
    });
    for (const cat of CATEGORY_ORDER) {
      entriesByCategory[cat]?.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    }
    return entriesByCategory;
  }, [members]);

  const categoriesWithMembers = useMemo(
    () => CATEGORY_ORDER.filter((cat) => (byCategory[cat]?.length ?? 0) > 0),
    [byCategory]
  );

  const grouped = useMemo(() => groupRollCallsByYearAndGestao(rollCallsList), [rollCallsList]);
  const showingDetail = rollCallDate && (showNewForm || rollCallsList.some((rc) => rc.date === rollCallDate));

  useEffect(() => {
    if (!showingDetail && !(showNewForm && rollCallDate)) return;
    if (categoriesWithMembers.length === 0) {
      setSelectedCategory('');
      return;
    }
    setSelectedCategory((current) =>
      current && categoriesWithMembers.includes(current) ? current : categoriesWithMembers[0]
    );
  }, [showingDetail, showNewForm, rollCallDate, categoriesWithMembers]);

  function setPresence(memberId: string, present: boolean) {
    if (!canEdit) return;
    setAttendance((prev) => ({ ...prev, [memberId]: present }));
  }

  function selectDate(date: string) {
    setShowNewForm(false);
    setRollCallDate(date);
    setSelectedCategory('');
  }

  function startNewFrequency() {
    setRollCallDate('');
    setAttendance({});
    setSaveGestao('1');
    setSelectedCategory('');
    setShowNewForm(true);
  }

  function cancelNewFrequency() {
    setShowNewForm(false);
    setRollCallDate('');
    setAttendance({});
    setSelectedCategory('');
  }

  async function handleDownloadModelo() {
    setDownloadingModelo(true);
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/frequencia-modelo', { headers });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || (res.status === 401 ? 'Faça login novamente.' : 'Erro ao baixar.'));
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
    if (!rollCallDate) {
      setError('Selecione a data da chamada.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/roll-calls', {
        method: 'POST',
        headers,
        body: JSON.stringify({ date: rollCallDate, attendance, gestao: saveGestao }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Erro ao salvar');
      }
      loadRollCallsList();
      setShowNewForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  function countPresentInCategory(cat: string): number {
    const list = byCategory[cat] || [];
    return list.filter((entry) => attendance[entry.memberId]).length;
  }

  function countMembersInCategory(cat: string): number {
    return (byCategory[cat] || []).length;
  }

  const activeList = selectedCategory ? byCategory[selectedCategory] || [] : [];
  const totalPresent = Object.values(attendance).filter(Boolean).length;
  const totalMarked = members.length;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Frequência</h1>
        <p className="text-slate-500 text-sm mt-1">
          {canEdit
            ? 'Selecione uma chamada existente ou crie uma nova para registrar presenças.'
            : 'Selecione uma data para consultar os presentes.'}
        </p>
      </div>

      {/* Painel de chamadas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-6 overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">Histórico de chamadas</h2>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startNewFrequency}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                + Nova frequência
              </button>
              <button
                type="button"
                onClick={handleDownloadModelo}
                disabled={downloadingModelo}
                className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {downloadingModelo ? 'Baixando...' : 'Modelo Excel'}
              </button>
            </div>
          )}
        </div>

        <div className="p-4">
          {loadingList ? (
            <p className="text-slate-500 text-sm">Carregando...</p>
          ) : grouped.length === 0 ? (
            <p className="text-slate-500 text-sm">
              {canEdit ? 'Nenhuma chamada ainda. Clique em "Nova frequência" para começar.' : 'Nenhuma chamada lançada ainda.'}
            </p>
          ) : (
            <div className="space-y-4">
              {grouped.map(({ year, gestao, items }) => (
                <div key={`${year}-${gestao}`}>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    {year} · Gestão {gestao === 'sem' ? '—' : gestao}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((rc) => {
                      const present = Object.values(rc.attendance || {}).filter(Boolean).length;
                      const isSelected = rollCallDate === rc.date && !showNewForm;
                      return (
                        <button
                          key={rc.id}
                          type="button"
                          onClick={() => selectDate(rc.date)}
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                              : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span className="font-medium">{formatDateBR(rc.date)}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
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

        {canEdit && (showNewForm || rollCallDate) && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3">
              <div className="flex flex-wrap items-end gap-3 flex-1">
                <div className="min-w-[140px]">
                  <label className="block text-slate-600 text-xs font-medium mb-1">Data</label>
                  <input
                    type="date"
                    value={rollCallDate}
                    onChange={(e) => setRollCallDate(e.target.value)}
                    max={today}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-slate-600 text-xs font-medium mb-1">Gestão</label>
                  <select
                    value={saveGestao}
                    onChange={(e) => setSaveGestao(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:border-blue-500 outline-none"
                  >
                    <option value="1">1</option>
                    <option value="2">2</option>
                  </select>
                </div>
                {rollCallDate && totalMarked > 0 && (
                  <p className="text-sm text-slate-600 pb-2">
                    <span className="font-semibold text-green-700">{totalPresent}</span>
                    <span className="text-slate-400"> / {totalMarked} presentes</span>
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {showNewForm && (
                  <button
                    type="button"
                    onClick={cancelNewFrequency}
                    className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600 hover:bg-white"
                  >
                    Cancelar
                  </button>
                )}
                {rollCallDate && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : 'Salvar'}
                  </button>
                )}
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
        <p className="text-slate-500 text-sm mb-4">Somente escrivão, MC, 1º Conselheiro e admin podem editar chamadas.</p>
      )}

      {loading ? (
        <p className="text-slate-500">Carregando membros...</p>
      ) : members.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-800 mb-2">Nenhum membro encontrado.</p>
          <p className="text-amber-700 text-sm mb-4">Cadastre membros em Membros no painel.</p>
          <button
            type="button"
            onClick={() => { setError(''); loadMembers(); }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm"
          >
            Tentar novamente
          </button>
        </div>
      ) : !showingDetail && !(showNewForm && rollCallDate) ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-10 text-center">
          <p className="text-slate-500 text-sm">
            {canEdit
              ? 'Escolha uma data no histórico ou crie uma nova frequência.'
              : 'Escolha uma data no histórico para ver os presentes.'}
          </p>
        </div>
      ) : (showingDetail || (showNewForm && rollCallDate)) && (
        <div>
          {loadingRoll ? (
            <p className="text-slate-500 py-8 text-center">Carregando chamada...</p>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Categoria</p>
                <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Categorias da chamada">
                  {categoriesWithMembers.map((cat) => {
                    const total = countMembersInCategory(cat);
                    const present = countPresentInCategory(cat);
                    const isActive = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {CATEGORY_LABELS[cat] || cat}
                        <span className={`ml-1.5 tabular-nums ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>
                          {present}/{total}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedCategory && activeList.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {activeList.map((entry, idx) => (
                    <li
                      key={`${entry.memberId}-${selectedCategory}-${idx}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50/80"
                    >
                      <div className="min-w-0">
                        <span className="text-slate-800 font-medium">{entry.name}</span>
                        {entry.role && (
                          <span className="text-slate-500 text-sm ml-2">{entry.role}</span>
                        )}
                        {entry.alsoIn && (
                          <span className="block text-slate-400 text-xs mt-0.5 truncate">
                            Também: {entry.alsoIn}
                          </span>
                        )}
                      </div>
                      {canEdit ? (
                        <div className="flex gap-1 shrink-0 p-0.5 bg-slate-100 rounded-lg">
                          <button
                            type="button"
                            onClick={() => setPresence(entry.memberId, true)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                              attendance[entry.memberId]
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-800'
                            }`}
                          >
                            Presente
                          </button>
                          <button
                            type="button"
                            onClick={() => setPresence(entry.memberId, false)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                              attendance[entry.memberId] === false
                                ? 'bg-red-500 text-white shadow-sm'
                                : 'text-slate-600 hover:text-slate-800'
                            }`}
                          >
                            Ausente
                          </button>
                        </div>
                      ) : (
                        <span className={`text-sm font-medium shrink-0 ${
                          attendance[entry.memberId] ? 'text-green-600' : 'text-slate-400'
                        }`}>
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
      )}
    </div>
  );
}
