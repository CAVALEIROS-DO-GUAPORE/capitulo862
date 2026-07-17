'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useDialogs } from '@/components/DialogsProvider';
import { canAccessSecretaria } from '@/lib/panel-permissions';
import { PanelAccessGate } from '@/components/PanelAccessGate';
import type { ChapterFeedback, FeedbackType } from '@/types';

const TYPE_OPTIONS: { value: FeedbackType; label: string }[] = [
  { value: 'reclamacao', label: 'Reclamação' },
  { value: 'sugestao', label: 'Sugestão' },
  { value: 'elogio', label: 'Elogio' },
];

const TYPE_LABELS: Record<FeedbackType, string> = {
  reclamacao: 'Reclamação',
  sugestao: 'Sugestão',
  elogio: 'Elogio',
};

const TYPE_STYLES: Record<FeedbackType, string> = {
  reclamacao: 'bg-red-50 text-red-800 border-red-200',
  sugestao: 'bg-amber-50 text-amber-800 border-amber-200',
  elogio: 'bg-emerald-50 text-emerald-800 border-emerald-200',
};

async function getAuthHeaders(json = false): Promise<HeadersInit> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: HeadersInit = json ? { 'Content-Type': 'application/json' } : {};
  if (session?.access_token) {
    (headers as Record<string, string>).Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function OuvidoriaPage() {
  const { confirm, toast } = useDialogs();
  const [user, setUser] = useState<{ role: string; name?: string } | null>(null);
  const [canView, setCanView] = useState(false);
  const [accessLoaded, setAccessLoaded] = useState(false);

  const [type, setType] = useState<FeedbackType>('sugestao');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [sending, setSending] = useState(false);

  const [items, setItems] = useState<ChapterFeedback[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [filter, setFilter] = useState<FeedbackType | 'todos'>('todos');

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    getAuthHeaders()
      .then((headers) => fetch('/api/feedback/access', { headers }))
      .then((r) => r.json())
      .then((data) => {
        setCanView(data.canView === true);
      })
      .catch(() => setCanView(false))
      .finally(() => setAccessLoaded(true));
  }, []);

  const loadItems = useCallback(async () => {
    setLoadingList(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/feedback', { headers });
      if (!res.ok) throw new Error('Erro ao carregar');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    if (canView) loadItems();
  }, [canView, loadItems]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      toast('Escreva a mensagem.', 'error');
      return;
    }
    setSending(true);
    try {
      const headers = await getAuthHeaders(true);
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({ type, message: trimmed, isAnonymous }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar');
      setMessage('');
      setIsAnonymous(false);
      setType('sugestao');
      toast('Manifestação enviada com sucesso.', 'success');
      if (canView) loadItems();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao enviar.', 'error');
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Excluir manifestação',
      message: 'Excluir esta manifestação permanentemente?',
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/feedback/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Erro ao excluir');
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast('Manifestação excluída.', 'success');
    } catch {
      toast('Erro ao excluir.', 'error');
    }
  }

  const filtered = filter === 'todos' ? items : items.filter((i) => i.type === filter);

  return (
    <PanelAccessGate role={user?.role} check={canAccessSecretaria} loading={!user || !accessLoaded}>
      <div className="max-w-3xl">
        <div className="mb-6">
          <Link href="/painel/secretaria" className="text-sm text-blue-600 hover:text-blue-800">
            ← Secretaria
          </Link>
          <h1 className="text-2xl font-bold text-blue-800 mt-2">Ouvidoria</h1>
          <p className="text-slate-600 mt-1 text-sm">
            Envie reclamações, sugestões ou elogios. O conteúdo é confidencial: apenas o Mestre
            Conselheiro e o Conselho Consultivo têm acesso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-5 mb-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={
                    'px-3 py-1.5 text-sm rounded-lg border transition-colors ' +
                    (type === opt.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300')
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="feedback-message" className="block text-sm font-medium text-slate-700 mb-1">
              Mensagem
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="Descreva sua manifestação com clareza e respeito."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              required
            />
            <p className="text-xs text-slate-400 mt-1">{message.length}/4000</p>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700">
              Enviar de forma anônima
              <span className="block text-slate-500 text-xs mt-0.5">
                Seu nome não será exibido para quem ler a manifestação.
              </span>
            </span>
          </label>

          {!isAnonymous && user?.name && (
            <p className="text-xs text-slate-500">
              Será enviado em nome de <strong>{user.name}</strong>.
            </p>
          )}

          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg"
          >
            {sending ? 'Enviando…' : 'Enviar'}
          </button>
        </form>

        {canView && (
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-semibold text-blue-800">Manifestações recebidas</h2>
              <div className="flex flex-wrap gap-1.5">
                {(['todos', ...TYPE_OPTIONS.map((o) => o.value)] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={
                      'px-2.5 py-1 text-xs rounded-md border ' +
                      (filter === f
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400')
                    }
                  >
                    {f === 'todos' ? 'Todos' : TYPE_LABELS[f]}
                  </button>
                ))}
              </div>
            </div>

            {loadingList ? (
              <p className="text-slate-500 text-sm py-6 text-center">Carregando…</p>
            ) : filtered.length === 0 ? (
              <p className="text-slate-500 text-sm py-6 text-center border border-dashed border-slate-200 rounded-lg">
                Nenhuma manifestação{filter !== 'todos' ? ` deste tipo` : ''} ainda.
              </p>
            ) : (
              <ul className="space-y-3">
                {filtered.map((item) => (
                  <li
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-lg p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={
                            'text-xs font-medium px-2 py-0.5 rounded border ' + TYPE_STYLES[item.type]
                          }
                        >
                          {TYPE_LABELS[item.type]}
                        </span>
                        <span className="text-xs text-slate-500">{formatDate(item.createdAt)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Excluir
                      </button>
                    </div>
                    <p className="text-sm text-slate-800 whitespace-pre-wrap">{item.message}</p>
                    <p className="text-xs text-slate-500 mt-3">
                      {item.isAnonymous
                        ? 'Anônimo'
                        : item.authorName
                          ? `De: ${item.authorName}`
                          : 'Autor identificado'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </PanelAccessGate>
  );
}
