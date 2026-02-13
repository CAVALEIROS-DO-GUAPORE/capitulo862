'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Member, RollCall } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  demolays: 'DeMolays ativos',
  seniores: 'Sêniores ativos',
  consultores: 'Consultores / Tios maçons',
  escudeiros: 'Escudeiros',
};

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

  function setPresence(memberId: string, present: boolean) {
    if (!canEdit) return;
    setAttendance((prev) => ({ ...prev, [memberId]: present }));
  }

  function selectDate(date: string) {
    setShowNewForm(false);
    setRollCallDate(date);
  }

  function startNewFrequency() {
    setRollCallDate('');
    setAttendance({});
    setSaveGestao('1');
    setShowNewForm(true);
  }

  function cancelNewFrequency() {
    setShowNewForm(false);
    setRollCallDate('');
    setAttendance({});
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
  type ChamadaEntry = { memberId: string; name: string; role: string };
  const entriesByCategory: Record<string, ChamadaEntry[]> = { demolays: [], seniores: [], consultores: [], escudeiros: [] };
  members.forEach((m) => {
    const cat = m.category || 'demolays';
    if (!entriesByCategory[cat]) entriesByCategory[cat] = [];
    entriesByCategory[cat].push({ memberId: m.id, name: m.name, role: m.role });
    (m.additionalRoles || []).forEach((r) => {
      if (!entriesByCategory[r.category]) entriesByCategory[r.category] = [];
      entriesByCategory[r.category].push({ memberId: m.id, name: m.name, role: r.role });
    });
  });
  const byCategory = entriesByCategory;

  const grouped = groupRollCallsByYearAndGestao(rollCallsList);
  const showingDetail = rollCallDate && (showNewForm || rollCallsList.some((rc) => rc.date === rollCallDate));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Frequência</h1>
      </div>
      <p className="text-slate-600 mb-6">
        Todas as chamadas aparecem abaixo separadas por ano e gestão. Todos podem ver; apenas escrivão, Mestre Conselheiro, 1º Conselheiro e admin podem editar ou lançar nova frequência.
      </p>

      {/* Lista de chamadas por ano e gestão — todos veem */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-6">
        <h2 className="px-4 py-3 bg-slate-100 text-slate-800 font-medium text-sm border-b border-slate-200">
          Chamadas por ano e gestão
        </h2>
        {loadingList ? (
          <p className="p-4 text-slate-500 text-sm">Carregando...</p>
        ) : grouped.length === 0 ? (
          <p className="p-4 text-slate-500 text-sm">Nenhuma chamada lançada ainda.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {grouped.map(({ year, gestao, items }) => (
              <div key={`${year}-${gestao}`} className="p-4">
                <h3 className="text-slate-800 font-medium mb-2">
                  {year} — Gestão {gestao === 'sem' ? '(não definida)' : gestao}
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {items.map((rc) => (
                    <li key={rc.id}>
                      <button
                        type="button"
                        onClick={() => selectDate(rc.date)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                          rollCallDate === rc.date && !showNewForm
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                        }`}
                      >
                        {formatDateBR(rc.date)}
                        <span className="ml-1.5 text-slate-500 font-normal">
                          ({Object.values(rc.attendance || {}).filter(Boolean).length} presentes)
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {canEdit && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={startNewFrequency}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            Incluir nova frequência
          </button>
          <button
            type="button"
            onClick={handleDownloadModelo}
            disabled={downloadingModelo}
            className="inline-flex items-center gap-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {downloadingModelo ? 'Baixando...' : 'Baixar modelo Pautas e Frequência (Excel)'}
          </button>
        </div>
      )}

      {canEdit && (showNewForm || rollCallDate) && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <div>
              <label className="block text-slate-700 text-sm mb-1">Data da chamada</label>
              <input
                type="date"
                value={rollCallDate}
                onChange={(e) => setRollCallDate(e.target.value)}
                max={today}
                className="px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-slate-700 text-sm mb-1">Gestão</label>
              <select
                value={saveGestao}
                onChange={(e) => setSaveGestao(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg"
              >
                <option value="1">1</option>
                <option value="2">2</option>
              </select>
            </div>
            {showNewForm && (
              <button
                type="button"
                onClick={cancelNewFrequency}
                className="px-3 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 text-sm"
              >
                Cancelar
              </button>
            )}
          </div>
          {rollCallDate && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar chamada'}
            </button>
          )}
        </div>
      )}

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {!canEdit && (
        <p className="text-slate-500 mb-4">Apenas escrivão, MC, 1º Conselheiro e admin podem editar ou criar nova frequência.</p>
      )}

      {loading ? (
        <p className="text-slate-500">Carregando membros...</p>
      ) : members.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <p className="text-amber-800 mb-2">Nenhum membro encontrado.</p>
          <p className="text-amber-700 text-sm mb-4">Cadastre membros em &quot;Membros&quot; no painel ou tente novamente.</p>
          <button
            type="button"
            onClick={() => { setError(''); loadMembers(); }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm"
          >
            Tentar novamente
          </button>
        </div>
      ) : !showingDetail && !(showNewForm && rollCallDate) ? (
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-8 text-center text-slate-500">
          {canEdit
            ? 'Clique em uma data acima para ver ou editar a chamada, ou em &quot;Incluir nova frequência&quot;.'
            : 'Clique em uma data acima para ver os presentes da chamada.'}
        </div>
      ) : (showingDetail || (showNewForm && rollCallDate)) && (
        <div className="space-y-6">
          {loadingRoll ? (
            <p className="text-slate-500">Carregando chamada...</p>
          ) : (
            ['demolays', 'seniores', 'consultores', 'escudeiros'].map((cat) => {
              const list = byCategory[cat] || [];
              if (list.length === 0) return null;
              return (
                <div key={cat} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                  <h2 className="px-4 py-2 bg-slate-100 text-slate-800 font-medium text-sm">
                    {CATEGORY_LABELS[cat] || cat}
                  </h2>
                  <ul className="divide-y divide-slate-100">
                    {list.map((entry, idx) => (
                      <li
                        key={`${entry.memberId}-${cat}-${idx}`}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <div>
                          <span className="text-slate-800">{entry.name}</span>
                          {entry.role && <span className="text-slate-500 text-sm ml-2">({entry.role})</span>}
                        </div>
                        {canEdit ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setPresence(entry.memberId, true)}
                              className={`px-3 py-1 rounded text-sm font-medium ${
                                attendance[entry.memberId]
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              Presente
                            </button>
                            <button
                              type="button"
                              onClick={() => setPresence(entry.memberId, false)}
                              className={`px-3 py-1 rounded text-sm font-medium ${
                                attendance[entry.memberId] === false
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              Ausente
                            </button>
                          </div>
                        ) : (
                          <span className={attendance[entry.memberId] ? 'text-green-600' : 'text-slate-400'}>
                            {attendance[entry.memberId] ? 'Presente' : 'Ausente'}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
