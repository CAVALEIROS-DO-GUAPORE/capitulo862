'use client';

import { useEffect, useState } from 'react';

const ROLES_CONVITES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao', 'tesoureiro'];

export default function PainelConvitesPage() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<{
    id: string;
    name: string;
    category?: string;
    additionalRoles?: { category: string; role: string }[];
  }[]>([]);
  const [submittingWord, setSubmittingWord] = useState(false);

  const [destino, setDestino] = useState('');
  const [assunto, setAssunto] = useState('');
  const [event, setEvent] = useState('');
  const [numOficio, setNumOficio] = useState('');
  const [gestao, setGestao] = useState('');
  const [eventDay, setEventDay] = useState('');
  const [eventMonth, setEventMonth] = useState('');
  const [eventYear, setEventYear] = useState('');
  const [eventHour, setEventHour] = useState('');
  const [eventMinute, setEventMinute] = useState('');
  const [local, setLocal] = useState('Loja Maçonica Estrela do Guaporé n°63');
  const [texto, setTexto] = useState('');
  const [membroConselhoId, setMembroConselhoId] = useState('');
  const [membroConselhoLivre, setMembroConselhoLivre] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
    setLoading(false);
  }, []);

  const canAccess = user?.role && ROLES_CONVITES.includes(user.role);

  useEffect(() => {
    if (!canAccess) return;
    (async () => {
      try {
        const res = await fetch('/api/members');
        if (!res.ok) return;
        const list = (await res.json()) as { id: string; name: string; category?: string }[];
        setMembers(Array.isArray(list) ? list : []);
      } catch {}
    })();
  }, [canAccess]);

  async function getAuthHeaders(): Promise<HeadersInit> {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  function buildPayload() {
    const date_event =
      eventDay && eventMonth && eventYear
        ? `${String(eventDay).padStart(2, '0')}/${String(eventMonth).padStart(2, '0')}/${String(eventYear)}`
        : '';
    const hora =
      eventHour && eventMinute
        ? `${String(eventHour).padStart(2, '0')}:${String(eventMinute).padStart(2, '0')}`
        : '';
    return {
      NUM: numOficio,
      GESTAO: gestao,
      destino,
      assunto,
      event,
      date_event,
      hora,
      local,
      texto,
      membroConselhoId: membroConselhoId || undefined,
      membro_conselho: membroConselhoLivre || undefined,
    };
  }

  async function downloadBlob(res: Response, filename: string) {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleBaixarWord() {
    setSubmittingWord(true);
    try {
      const res = await fetch('/api/convites/oficio', {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${res.status}`);
      }
      await downloadBlob(res, `convite-${new Date().toISOString().slice(0, 10)}.docx`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao gerar convite.');
    } finally {
      setSubmittingWord(false);
    }
  }

  const consultores = members
    .filter((m) => {
      const cat = (m.category || '').toLowerCase();
      if (cat === 'consultores') return true;
      const extras = Array.isArray(m.additionalRoles) ? m.additionalRoles : [];
      return extras.some((r) => (r.category || '').toLowerCase() === 'consultores');
    })
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR'));

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-slate-600">Carregando...</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-blue-800 mb-6">Convites</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <p className="text-amber-800 font-medium">Sem permissão</p>
          <p className="text-amber-700 text-sm mt-1">
            Apenas escrivão, tesoureiro, Mestre Conselheiro, 1º Conselheiro e admin podem acessar esta área.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-800 mb-6">Convites</h1>
      <p className="text-slate-600 mb-6">
        Gere um convite em Word a partir do modelo oficial.
      </p>

      <div className="bg-white rounded-lg border border-slate-200 p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Número do ofício">
            <input
              value={numOficio}
              onChange={(e) => setNumOficio(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ex.: 02"
            />
            <p className="mt-1 text-xs text-slate-500">Informe apenas o número. O ano é preenchido automaticamente.</p>
          </Field>

          <Field label="Gestão">
            <select
              value={gestao}
              onChange={(e) => setGestao(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">Selecione</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </Field>

          <Field label="Destino">
            <input
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ex.: Ilmo. Sr. ..."
            />
          </Field>

          <Field label="Assunto">
            <input
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ex.: Convite para cerimônia..."
            />
          </Field>

          <Field label="Evento">
            <input
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Ex.: Sessão Magna / Cerimônia..."
            />
          </Field>

          <Field label="Data do evento">
            <div className="grid grid-cols-3 gap-2">
              <select
                value={eventDay}
                onChange={(e) => setEventDay(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Dia</option>
                {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                  <option key={d} value={d}>{d.padStart(2, '0')}</option>
                ))}
              </select>
              <select
                value={eventMonth}
                onChange={(e) => setEventMonth(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Mês</option>
                {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((m) => (
                  <option key={m} value={m}>{m.padStart(2, '0')}</option>
                ))}
              </select>
              <select
                value={eventYear}
                onChange={(e) => setEventYear(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Ano</option>
                {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() + i)).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </Field>

          <Field label="Hora">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={eventHour}
                onChange={(e) => setEventHour(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Hora</option>
                {Array.from({ length: 24 }, (_, i) => String(i)).map((h) => (
                  <option key={h} value={h}>{h.padStart(2, '0')}</option>
                ))}
              </select>
              <select
                value={eventMinute}
                onChange={(e) => setEventMinute(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Min</option>
                {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </Field>

          <Field label="Local">
            <input
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </Field>

          <Field label="Membro do Conselho (opcional)">
            <div className="grid grid-cols-1 gap-2">
              <select
                value={membroConselhoId}
                onChange={(e) => {
                  setMembroConselhoId(e.target.value);
                  if (e.target.value) setMembroConselhoLivre('');
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Selecionar (opcional)</option>
                {consultores.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <input
                value={membroConselhoLivre}
                onChange={(e) => {
                  setMembroConselhoLivre(e.target.value);
                  if (e.target.value) setMembroConselhoId('');
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Ou digite o nome (opcional)"
              />
            </div>
          </Field>

          <Field label="Texto" fullWidth>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm min-h-[120px]"
              placeholder="Escreva um breve texto para incentivar a presença..."
            />
          </Field>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleBaixarWord}
            disabled={submittingWord}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              submittingWord ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {submittingWord ? 'Gerando...' : 'Baixar Word (.docx)'}
          </button>
          <p className="text-xs text-slate-500">
            A data do preenchimento, Mestre Conselheiro e Escrivão são inseridos automaticamente pelo sistema.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  fullWidth,
  children,
}: {
  label: string;
  fullWidth?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
