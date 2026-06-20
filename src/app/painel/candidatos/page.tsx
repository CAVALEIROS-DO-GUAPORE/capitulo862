'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDialogs } from '@/components/DialogsProvider';
import Link from 'next/link';
import type { MembershipCandidate, CandidateDocument } from '@/types';
import {
  CANDIDATE_SOLICITATION_DOC_TYPES,
  CANDIDATE_SINDICANCIA_DOC_TYPE,
  CANDIDATE_DOC_LABELS,
  type CandidateDocType,
} from '@/lib/candidate-documents';

const EDITOR_ROLES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro'];

async function getAuthHeaders(json = false): Promise<HeadersInit> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: HeadersInit = json ? { 'Content-Type': 'application/json' } : {};
  if (session?.access_token) {
    (headers as Record<string, string>).Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

function docForType(documents: CandidateDocument[] | undefined, docType: CandidateDocType) {
  return documents?.find((d) => d.docType === docType);
}

export default function PainelCandidatosPage() {
  const { confirm, toast } = useDialogs();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [canView, setCanView] = useState<boolean | null>(null);
  const [candidates, setCandidates] = useState<MembershipCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MembershipCandidate | null>(null);
  const [sindicanciaResumo, setSindicanciaResumo] = useState('');
  const [savingResumo, setSavingResumo] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const canEdit = user?.role && EDITOR_ROLES.includes(user.role);

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
      .then((headers) => fetch('/api/candidatos/access', { headers }))
      .then((r) => r.json())
      .then((data) => setCanView(data.canView === true))
      .catch(() => setCanView(false));
  }, []);

  const loadCandidates = useCallback(async function loadCandidates() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/candidatos', { headers });
      if (!res.ok) throw new Error('Erro ao carregar');
      const data = await res.json();
      setCandidates(Array.isArray(data) ? data : []);
    } catch {
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) loadCandidates();
    else if (canView === false) setLoading(false);
  }, [canView, loadCandidates]);

  useEffect(() => {
    if (!canView) return;
    const supabase = createClient();
    const channel = supabase
      .channel('candidatos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'membership_candidates' }, () => loadCandidates())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidate_documents' }, () => loadCandidates())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [canView, loadCandidates]);

  useEffect(() => {
    setSindicanciaResumo(selected?.sindicanciaResumo ?? '');
  }, [selected?.id, selected?.sindicanciaResumo]);

  useEffect(() => {
    if (!selected) return;
    const updated = candidates.find((c) => c.id === selected.id);
    if (updated) setSelected(updated);
  }, [candidates, selected?.id]);

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Excluir candidatura',
      message: 'Excluir esta candidatura e todos os documentos anexados?',
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/candidatos/${id}`, { method: 'DELETE', headers });
      if (!res.ok) throw new Error('Erro ao excluir');
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      if (selected?.id === id) setSelected(null);
      toast('Candidatura excluída.', 'success');
    } catch {
      toast('Erro ao excluir.', 'error');
    }
  }

  async function markAsRead(candidate: MembershipCandidate) {
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
    } catch {}
  }

  async function handleUploadDoc(docType: CandidateDocType, file: File) {
    if (!selected || !canEdit) return;
    setUploadingDoc(docType);
    try {
      const formData = new FormData();
      formData.append('docType', docType);
      formData.append('file', file);
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/candidatos/${selected.id}/documents`, {
        method: 'POST',
        headers,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar');
      await loadCandidates();
      toast('Documento anexado.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao enviar documento.', 'error');
    } finally {
      setUploadingDoc(null);
    }
  }

  async function handleRemoveDoc(docType: CandidateDocType) {
    if (!selected || !canEdit) return;
    const ok = await confirm({
      title: 'Remover documento',
      message: 'Remover este anexo?',
      confirmLabel: 'Remover',
      danger: true,
    });
    if (!ok) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/candidatos/${selected.id}/documents?docType=${docType}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Erro ao remover');
      await loadCandidates();
      toast('Documento removido.', 'success');
    } catch {
      toast('Erro ao remover documento.', 'error');
    }
  }

  async function handleDownloadDoc(docType: CandidateDocType, fileName: string) {
    if (!selected) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/candidatos/${selected.id}/documents/${docType}/download`, { headers });
      if (!res.ok) throw new Error('Erro ao baixar');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast('Erro ao baixar documento.', 'error');
    }
  }

  async function handleSaveResumo() {
    if (!selected || !canEdit) return;
    setSavingResumo(true);
    try {
      const headers = await getAuthHeaders(true);
      const res = await fetch(`/api/candidatos/${selected.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ sindicanciaResumo: sindicanciaResumo.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      await loadCandidates();
      toast('Resumo salvo.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao salvar resumo.', 'error');
    } finally {
      setSavingResumo(false);
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

  function renderDocSlot(docType: CandidateDocType) {
    if (!selected) return null;
    const doc = docForType(selected.documents, docType);
    const label = CANDIDATE_DOC_LABELS[docType];
    const busy = uploadingDoc === docType;

    return (
      <div key={docType} className="rounded-lg border border-slate-200 p-3 bg-slate-50/50">
        <p className="text-sm font-medium text-slate-800 mb-2">{label}</p>
        {doc ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleDownloadDoc(docType, doc.fileName)}
              className="text-sm text-blue-600 hover:underline truncate max-w-full"
            >
              {doc.fileName}
            </button>
            {canEdit && (
              <>
                <label className="text-xs text-slate-500 hover:text-blue-600 cursor-pointer">
                  {busy ? 'Enviando...' : 'Substituir'}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadDoc(docType, f);
                      e.target.value = '';
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => handleRemoveDoc(docType)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remover
                </button>
              </>
            )}
          </div>
        ) : canEdit ? (
          <label className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
            {busy ? 'Enviando...' : '+ Anexar arquivo'}
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadDoc(docType, f);
                e.target.value = '';
              }}
            />
          </label>
        ) : (
          <p className="text-sm text-slate-400">Nenhum arquivo</p>
        )}
      </div>
    );
  }

  const unreadCount = candidates.filter((c) => {
    if (user?.role === 'mestre_conselheiro') return !c.readByMc;
    if (user?.role === 'primeiro_conselheiro') return !c.readByFirstCounselor;
    if (user?.role === 'admin') return !c.readByMc || !c.readByFirstCounselor;
    return false;
  }).length;

  if (canView === null) {
    return <p className="text-slate-500">Carregando...</p>;
  }

  if (!canView) {
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
        <Link href="/ser-demolay" className="text-blue-600 hover:underline text-sm">
          Ver formulário público →
        </Link>
      </div>
      <p className="text-slate-600 mb-6 text-sm">
        {canEdit
          ? 'MC e 1º Conselheiro podem anexar documentos e registrar a sindicância. Escrivão, tesoureiro, sêniores e consultores podem visualizar.'
          : 'Visualização das candidaturas e documentos anexados.'}
      </p>

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : candidates.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-600">
          Nenhuma candidatura recebida ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-2">
            {candidates.map((c) => {
              const isNew =
                (user?.role === 'mestre_conselheiro' && !c.readByMc) ||
                (user?.role === 'primeiro_conselheiro' && !c.readByFirstCounselor) ||
                (user?.role === 'admin' && (!c.readByMc || !c.readByFirstCounselor));
              const docCount = c.documents?.length ?? 0;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelected(c);
                    markAsRead(c);
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
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
                  {docCount > 0 && (
                    <p className="text-xs text-slate-400 mt-1">{docCount} documento{docCount > 1 ? 's' : ''}</p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-2">
            {selected ? (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <h2 className="text-lg font-bold text-blue-800">{selected.fullName}</h2>
                    {canEdit && (
                      <button
                        onClick={() => handleDelete(selected.id)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm shrink-0"
                      >
                        Excluir
                      </button>
                    )}
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
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
                      <dt className="text-slate-500">Pai maçom?</dt>
                      <dd className="text-slate-800">{selected.fatherIsMason ? 'Sim' : 'Não'}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Telefone</dt>
                      <dd className="text-slate-800">{selected.phone}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500">E-mail</dt>
                      <dd className="text-slate-800">{selected.email}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500">Conhece algum DeMolay?</dt>
                      <dd className="text-slate-800">
                        {selected.knowsDemolay ? `Sim — ${selected.demolayContactName || '—'}` : 'Não'}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-slate-500">Motivo do interesse</dt>
                      <dd className="text-slate-800 whitespace-pre-wrap">{selected.interestReason}</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h3 className="font-semibold text-slate-800 mb-1">Ficha de Solicitação DeMolay</h3>
                  <p className="text-slate-500 text-xs mb-4">Anexos opcionais — podem ser enviados aos poucos.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CANDIDATE_SOLICITATION_DOC_TYPES.map((docType) => renderDocSlot(docType))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h3 className="font-semibold text-slate-800 mb-1">Ficha de Sindicância e Resumo</h3>
                  <p className="text-slate-500 text-xs mb-4">
                    Anexe a ficha de sindicância e registre a avaliação do candidato.
                  </p>
                  <div className="mb-4">
                    {renderDocSlot(CANDIDATE_SINDICANCIA_DOC_TYPE)}
                  </div>
                  <div>
                    <label htmlFor="sindicancia-resumo" className="block text-sm font-medium text-slate-700 mb-1">
                      Resumo da sindicância
                    </label>
                    {canEdit ? (
                      <>
                        <textarea
                          id="sindicancia-resumo"
                          rows={5}
                          value={sindicanciaResumo}
                          onChange={(e) => setSindicanciaResumo(e.target.value)}
                          placeholder="Descreva a impressão sobre o candidato, pontos positivos, defeitos observados..."
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y"
                        />
                        <button
                          type="button"
                          onClick={handleSaveResumo}
                          disabled={savingResumo}
                          className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                          {savingResumo ? 'Salvando...' : 'Salvar resumo'}
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-lg p-3 min-h-[80px]">
                        {selected.sindicanciaResumo || 'Nenhum resumo registrado.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                Selecione uma candidatura para ver os detalhes.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
