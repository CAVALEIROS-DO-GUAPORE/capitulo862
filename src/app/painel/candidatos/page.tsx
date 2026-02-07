'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Candidate {
  id: string;
  fullName: string;
  motherName: string;
  fatherName?: string;
  birthDate: string;
  city: string;
  fatherIsMason: boolean;
  phone: string;
  email: string;
  knowsDemolay: boolean;
  demolayContactName?: string;
  interestReason: string;
  createdAt: string;
  readByMc?: boolean;
  readByFirstCounselor?: boolean;
}

export default function PainelCandidatosPage() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Candidate | null>(null);

  const canView = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro'];

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const loadCandidates = useCallback(function loadCandidates() {
    fetch('/api/candidatos')
      .then((res) => res.json())
      .then((data) => setCandidates(Array.isArray(data) ? data : []))
      .catch(() => setCandidates([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadCandidates();
  }, [loadCandidates]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('candidatos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'membership_candidates' }, () => loadCandidates())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadCandidates]);

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta candidatura?')) return;
    try {
      const res = await fetch(`/api/candidatos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      if (selected?.id === id) setSelected(null);
    } catch {
      alert('Erro ao excluir');
    }
  }

  async function markAsRead(candidate: Candidate) {
    const role = user?.role;
    const reader = role === 'mestre_conselheiro' ? 'mc' : role === 'primeiro_conselheiro' ? 'first_counselor' : null;
    if (!reader || (reader === 'mc' && candidate.readByMc) || (reader === 'first_counselor' && candidate.readByFirstCounselor)) return;

    try {
      await fetch(`/api/candidatos/${candidate.id}/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reader }),
      });
      setCandidates((prev) =>
        prev.map((c) =>
          c.id === candidate.id
            ? { ...c, ...(reader === 'mc' ? { readByMc: true } : { readByFirstCounselor: true }) }
            : c
        )
      );
      if (selected?.id === candidate.id) {
        setSelected((s) => (s ? { ...s, ...(reader === 'mc' ? { readByMc: true } : { readByFirstCounselor: true }) } : null));
      }
    } catch {}
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

  const unreadCount = candidates.filter((c) => {
    if (user?.role === 'mestre_conselheiro') return !c.readByMc;
    if (user?.role === 'primeiro_conselheiro') return !c.readByFirstCounselor;
    if (user?.role === 'admin') return !c.readByMc || !c.readByFirstCounselor;
    return false;
  }).length;

  if (!user || !canView.includes(user.role)) {
    return (
      <div>
        <p className="text-slate-600">Você não tem permissão para visualizar as candidaturas.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-blue-800">
          Candidaturas
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full">
              {unreadCount} nova{unreadCount > 1 ? 's' : ''}
            </span>
          )}
        </h1>
        <Link
          href="/ser-demolay"
          className="text-blue-600 hover:underline text-sm"
        >
          Ver formulário público →
        </Link>
      </div>
      <p className="text-slate-600 mb-6">
        Novas fichas cadastrais aparecem aqui. MC e 1º Conselheiro são notificados quando alguém preenche o formulário.
      </p>

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : candidates.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center text-slate-600">
          Nenhuma candidatura recebida ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-2">
            {candidates
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((c) => {
                const isNew =
                  (user?.role === 'mestre_conselheiro' && !c.readByMc) ||
                  (user?.role === 'primeiro_conselheiro' && !c.readByFirstCounselor) ||
                  (user?.role === 'admin' && (!c.readByMc || !c.readByFirstCounselor));
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelected(c);
                      markAsRead(c);
                    }}
                    className={`w-full text-left p-4 rounded-lg border transition-colors ${
                      selected?.id === c.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-medium text-slate-800 truncate">{c.fullName}</span>
                      {isNew && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-blue-600" title="Não lida" />
                      )}
                    </div>
                    <p className="text-slate-500 text-sm mt-1">{formatDate(c.createdAt)}</p>
                  </button>
                );
              })}
          </div>

          <div className="lg:col-span-2">
            {selected ? (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <h2 className="text-lg font-bold text-blue-800">{selected.fullName}</h2>
                  <button
                    onClick={() => handleDelete(selected.id)}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm shrink-0"
                  >
                    Excluir
                  </button>
                </div>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Nome da mãe</dt>
                    <dd className="text-slate-800">{selected.motherName}</dd>
                  </div>
                  {selected.fatherName && (
                    <div>
                      <dt className="text-slate-500">Nome do pai</dt>
                      <dd className="text-slate-800">{selected.fatherName}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-slate-500">Data de nascimento</dt>
                    <dd className="text-slate-800">
                      {new Date(selected.birthDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Cidade</dt>
                    <dd className="text-slate-800">{selected.city}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">O pai é maçom?</dt>
                    <dd className="text-slate-800">{selected.fatherIsMason ? 'Sim' : 'Não'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Telefone</dt>
                    <dd className="text-slate-800">{selected.phone}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">E-mail</dt>
                    <dd className="text-slate-800">{selected.email}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Conhece algum DeMolay?</dt>
                    <dd className="text-slate-800">
                      {selected.knowsDemolay
                        ? `Sim - ${selected.demolayContactName || '—'}`
                        : 'Não'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Por que se interessa em entrar na Ordem</dt>
                    <dd className="text-slate-800 whitespace-pre-wrap">{selected.interestReason}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Enviado em</dt>
                    <dd className="text-slate-800">{formatDate(selected.createdAt)}</dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-8 text-center text-slate-500">
                Selecione uma candidatura para ver os detalhes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
