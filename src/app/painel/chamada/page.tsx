'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Member } from '@/types';

const CATEGORY_LABELS: Record<string, string> = {
  demolays: 'DeMolays ativos',
  seniores: 'Sêniores ativos',
  consultores: 'Consultores / Tios maçons',
  escudeiros: 'Escudeiros',
};

export default function PainelChamadaPage() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [rollCallDate, setRollCallDate] = useState('');
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [loadingRoll, setLoadingRoll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canEdit = user?.role && ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao'].includes(user.role);

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
    if (!rollCallDate || !canEdit) return;
    setLoadingRoll(true);
    setError('');
    fetch(`/api/roll-calls?date=${encodeURIComponent(rollCallDate)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.attendance === 'object') {
          setAttendance(data.attendance);
        } else {
          const initial: Record<string, boolean> = {};
          members.forEach((m) => { initial[m.id] = false; });
          setAttendance(initial);
        }
      })
      .catch(() => setAttendance({}))
      .finally(() => setLoadingRoll(false));
  }, [rollCallDate, canEdit, members.length]);

  useEffect(() => {
    if (members.length && Object.keys(attendance).length === 0 && !loadingRoll) {
      const initial: Record<string, boolean> = {};
      members.forEach((m) => { initial[m.id] = attendance[m.id] ?? false; });
      if (Object.keys(initial).length) setAttendance((prev) => ({ ...initial, ...prev }));
    }
  }, [members, loadingRoll, rollCallDate]);

  function setPresence(memberId: string, present: boolean) {
    if (!canEdit) return;
    setAttendance((prev) => ({ ...prev, [memberId]: present }));
  }

  async function handleSave() {
    if (!rollCallDate) {
      setError('Selecione a data da chamada.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/roll-calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: rollCallDate, attendance }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Erro ao salvar');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const byCategory = members.reduce((acc, m) => {
    const cat = m.category || 'demolays';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(m);
    return acc;
  }, {} as Record<string, Member[]>);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Chamada</h1>
      </div>
      <p className="text-slate-600 mb-6">
        Escolha a data da reunião e marque presença ou ausência dos membros. Use esta chamada depois ao redigir a ata.
      </p>

      {canEdit && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <label className="block text-slate-700 text-sm mb-2">Data da chamada</label>
          <input
            type="date"
            value={rollCallDate}
            onChange={(e) => setRollCallDate(e.target.value)}
            max={today}
            className="px-3 py-2 border border-slate-300 rounded-lg"
          />
          {rollCallDate && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="ml-3 mt-2 sm:mt-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar chamada'}
            </button>
          )}
        </div>
      )}

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {!canEdit && (
        <p className="text-slate-500 mb-4">Apenas escrivão e conselho podem registrar a chamada.</p>
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
      ) : !rollCallDate && canEdit ? (
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-8 text-center text-slate-500">
          Selecione a data da chamada para marcar presença.
        </div>
      ) : rollCallDate && (
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
                    {list.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        <span className="text-slate-800">{m.name}</span>
                        {canEdit ? (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setPresence(m.id, true)}
                              className={`px-3 py-1 rounded text-sm font-medium ${
                                attendance[m.id]
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              Presente
                            </button>
                            <button
                              type="button"
                              onClick={() => setPresence(m.id, false)}
                              className={`px-3 py-1 rounded text-sm font-medium ${
                                attendance[m.id] === false
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              Ausente
                            </button>
                          </div>
                        ) : (
                          <span className={attendance[m.id] ? 'text-green-600' : 'text-slate-400'}>
                            {attendance[m.id] ? 'Presente' : 'Ausente'}
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
