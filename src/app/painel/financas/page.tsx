'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDialogs } from '@/components/DialogsProvider';
import { PanelAccessGate } from '@/components/PanelAccessGate';
import { FINANCE_VIEWER_ROLES, canViewFinance } from '@/lib/panel-permissions';
import type { FinanceEntry, FinanceReceipt } from '@/types';

type PublicReceipt = Omit<FinanceReceipt, 'storagePath'>;

async function getAuthHeaders(json = false): Promise<HeadersInit> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: HeadersInit = json ? { 'Content-Type': 'application/json' } : {};
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

function parseDownloadName(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) return fallback;
  const match = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1].replace(/"/g, ''));
    } catch {
      return match[1];
    }
  }
  return fallback;
}

export default function PainelFinancasPage() {
  const { confirm, toast } = useDialogs();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [entriesAll, setEntriesAll] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [form, setForm] = useState({
    type: 'entrada' as 'entrada' | 'saida',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingReceipts, setExistingReceipts] = useState<PublicReceipt[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [filtroAno, setFiltroAno] = useState<string>('');
  const [filtroMes, setFiltroMes] = useState<string>('');
  const [filtroData, setFiltroData] = useState<string>('');

  const canManage = canViewFinance(user?.role);

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const loadEntries = useCallback(async function loadEntries() {
    const params = new URLSearchParams();
    if (filtroData) params.set('data', filtroData);
    else if (filtroAno) {
      params.set('ano', filtroAno);
      if (filtroMes) params.set('mes', filtroMes);
    }
    const qs = params.toString();
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/finance${qs ? `?${qs}` : ''}`, { headers, credentials: 'include' });
      const data = await res.json();
      setEntries(res.ok && Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [filtroAno, filtroMes, filtroData]);

  const loadEntriesAll = useCallback(async function loadEntriesAll() {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/finance', { headers, credentials: 'include' });
      const data = await res.json();
      setEntriesAll(res.ok && Array.isArray(data) ? data : []);
    } catch {
      setEntriesAll([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadEntries();
  }, [loadEntries]);

  useEffect(() => {
    loadEntriesAll();
  }, [loadEntriesAll]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('finance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_entries' }, () => {
        loadEntries();
        loadEntriesAll();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'finance_receipts' }, () => {
        loadEntries();
        loadEntriesAll();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadEntries, loadEntriesAll]);

  const saldoPeriodo = entries.reduce((sum, e) => sum + e.amount, 0);
  const saldoAtual = entriesAll.reduce((sum, e) => sum + e.amount, 0);
  const totalEntradas = entries.reduce((sum, e) => sum + (e.amount > 0 ? e.amount : 0), 0);
  const totalSaidas = entries.reduce((sum, e) => sum + (e.amount < 0 ? Math.abs(e.amount) : 0), 0);

  const money = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }, []);

  async function loadReceiptsForEntry(entryId: string) {
    setReceiptsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/finance/${entryId}/receipts`, { headers });
      if (res.ok) {
        const data = await res.json();
        setExistingReceipts(Array.isArray(data) ? data : []);
      } else {
        setExistingReceipts([]);
      }
    } catch {
      setExistingReceipts([]);
    } finally {
      setReceiptsLoading(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setForm({
      type: 'entrada',
      amount: '',
      description: '',
      date: new Date().toISOString().slice(0, 10),
    });
    setPendingFiles([]);
    setExistingReceipts([]);
    setModal('add');
    setError('');
  }

  function openEdit(e: FinanceEntry) {
    setEditing(e);
    setForm({
      type: e.amount >= 0 ? 'entrada' : 'saida',
      amount: Math.abs(e.amount).toString(),
      description: e.description || '',
      date: e.date,
    });
    setPendingFiles([]);
    setExistingReceipts([]);
    setModal('edit');
    setError('');
    loadReceiptsForEntry(e.id);
  }

  function closeModal() {
    setModal(null);
    setEditing(null);
    setPendingFiles([]);
    setExistingReceipts([]);
  }

  function handleFileSelect(ev: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(ev.target.files ?? []);
    if (selected.length === 0) return;
    setPendingFiles((prev) => [...prev, ...selected]);
    ev.target.value = '';
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadReceipts(entryId: string, files: File[]) {
    if (files.length === 0) return;
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/finance/${entryId}/receipts`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Erro ao enviar comprovantes');
    }
  }

  async function handleRemoveReceipt(receiptId: string) {
    if (!editing) return;
    const ok = await confirm({
      title: 'Remover comprovante',
      message: 'Remover este comprovante?',
      confirmLabel: 'Remover',
      danger: true,
    });
    if (!ok) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/finance/${editing.id}/receipts/${receiptId}`, {
        method: 'DELETE',
        headers,
      });
      if (!res.ok) throw new Error('Erro ao remover');
      setExistingReceipts((prev) => prev.filter((r) => r.id !== receiptId));
      toast('Comprovante removido.', 'success');
    } catch {
      toast('Erro ao remover comprovante.', 'error');
    }
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    const value = parseFloat(form.amount.replace(',', '.'));
    if (isNaN(value) || value <= 0) {
      setError('Valor inválido');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        type: form.type,
        amount: value,
        description: form.description,
        date: form.date,
      };
      let entryId = editing?.id;
      if (editing) {
        const res = await fetch(`/api/finance/${editing.id}`, {
          method: 'PATCH',
          headers: await getAuthHeaders(true),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Erro ao atualizar');
        }
      } else {
        const res = await fetch('/api/finance', {
          method: 'POST',
          headers: await getAuthHeaders(true),
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Erro ao lançar');
        }
        const created = await res.json();
        entryId = created.id;
      }

      if (entryId && pendingFiles.length > 0) {
        await uploadReceipts(entryId, pendingFiles);
      }

      loadEntries();
      loadEntriesAll();
      closeModal();
      toast(editing ? 'Movimentação atualizada.' : 'Movimentação lançada.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Excluir movimentação',
      message: 'Excluir esta movimentação e os comprovantes anexados?',
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/finance/${id}`, { method: 'DELETE', headers: await getAuthHeaders() });
      if (!res.ok) throw new Error('Erro ao excluir');
      loadEntries();
      loadEntriesAll();
      toast('Movimentação excluída.', 'success');
    } catch {
      toast('Erro ao excluir.', 'error');
    }
  }

  async function handleDownloadReceipts(entry: FinanceEntry) {
    setDownloadingId(entry.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/finance/${entry.id}/receipts/download`, { headers });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erro ao baixar');
      }
      const blob = await res.blob();
      const fallback = (entry.receiptCount ?? 0) > 1
        ? `comprovantes-${entry.date}.zip`
        : 'comprovante';
      const fileName = parseDownloadName(res.headers.get('Content-Disposition'), fallback);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao baixar comprovantes.', 'error');
    } finally {
      setDownloadingId(null);
    }
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const anos = (() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => y - i);
  })();
  const meses = [
    { value: '', label: 'Todos' },
    { value: '1', label: 'Jan' }, { value: '2', label: 'Fev' }, { value: '3', label: 'Mar' },
    { value: '4', label: 'Abr' }, { value: '5', label: 'Mai' }, { value: '6', label: 'Jun' },
    { value: '7', label: 'Jul' }, { value: '8', label: 'Ago' }, { value: '9', label: 'Set' },
    { value: '10', label: 'Out' }, { value: '11', label: 'Nov' }, { value: '12', label: 'Dez' },
  ];
  const pdfUrl = (() => {
    const params = new URLSearchParams();
    if (filtroData) params.set('data', filtroData);
    else if (filtroAno) {
      params.set('ano', filtroAno);
      if (filtroMes) params.set('mes', filtroMes);
    }
    const qs = params.toString();
    return `/api/finance/extrato-pdf${qs ? `?${qs}` : ''}`;
  })();

  return (
    <PanelAccessGate role={user?.role} allowed={FINANCE_VIEWER_ROLES} loading={!user}>
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Finanças</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filtroAno}
            onChange={(e) => { setFiltroAno(e.target.value); setFiltroMes(''); setFiltroData(''); }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="">Todos os anos</option>
            {anos.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            disabled={!filtroAno}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            {meses.map((m) => (
              <option key={m.value || 't'} value={m.value}>{m.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={filtroData}
            onChange={(e) => { setFiltroData(e.target.value); setFiltroAno(''); setFiltroMes(''); }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
            title="Filtrar por data exata"
          />
          <a
            href={pdfUrl}
            download="extrato-financeiro.pdf"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium"
          >
            Gerar extrato PDF
          </a>
          {canManage && (
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              + Lançar Movimentação
            </button>
          )}
        </div>
      </div>
      <p className="text-slate-600 mb-6">
        Entradas e saídas financeiras do capítulo. Filtre por ano, mês ou data e gere o extrato em PDF.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h3 className="text-slate-600 text-sm mb-1">Entradas no período</h3>
          <p className="text-2xl font-bold text-green-700 tabular-nums">
            {money(totalEntradas)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h3 className="text-slate-600 text-sm mb-1">Saídas no período</h3>
          <p className="text-2xl font-bold text-red-700 tabular-nums">
            {money(totalSaidas)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h3 className="text-slate-600 text-sm mb-1">Saldo atual do capítulo</h3>
          <p className={`text-2xl font-bold ${saldoAtual >= 0 ? 'text-blue-800' : 'text-red-600'}`}>
            {money(saldoAtual)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Saldo do período selecionado: <span className={saldoPeriodo >= 0 ? 'text-green-700' : 'text-red-700'}>{money(saldoPeriodo)}</span>
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="py-3 px-4 text-slate-600 font-medium">Data</th>
                <th className="py-3 px-4 text-slate-600 font-medium">Descrição</th>
                <th className="py-3 px-4 text-slate-600 font-medium">Tipo</th>
                <th className="py-3 px-4 text-slate-600 font-medium text-right">Valor</th>
                <th className="py-3 px-4 text-slate-600 font-medium">Comprovantes</th>
                {canManage && <th className="py-3 px-4 text-slate-600 font-medium w-24">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-700">
                    {new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-3 px-4 text-slate-700">{e.description || '—'}</td>
                  <td className="py-3 px-4">
                    <span className={e.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {e.amount >= 0 ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-medium tabular-nums whitespace-nowrap">
                    <span className={e.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {e.amount >= 0 ? '+' : '-'}
                      {money(Math.abs(e.amount)).replace('-', '')}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {(e.receiptCount ?? 0) > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleDownloadReceipts(e)}
                        disabled={downloadingId === e.id}
                        className="text-blue-600 hover:underline text-sm disabled:opacity-50"
                      >
                        {downloadingId === e.id ? 'Baixando...' : 'Ver comprovantes'}
                      </button>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </td>
                  {canManage && (
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(e)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {entries.length === 0 && (
            <p className="py-8 text-center text-slate-500">Nenhuma movimentação.</p>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-blue-800 mb-4">
              {editing ? 'Editar Movimentação' : 'Lançar Movimentação'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-700 text-sm mb-1">Tipo *</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'entrada' | 'saida' }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-700 text-sm mb-1">Valor (R$) *</label>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 text-sm mb-1">Data *</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 text-sm mb-1">Descrição</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              {canManage && (
                <div>
                  <label className="block text-slate-700 text-sm mb-1">
                    Comprovantes <span className="text-slate-400 font-normal">(opcional)</span>
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    PDF ou imagem. Os arquivos são comprimidos automaticamente ao anexar.
                  </p>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleFileSelect}
                    className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />

                  {receiptsLoading && editing && (
                    <p className="text-xs text-slate-500 mt-2">Carregando comprovantes...</p>
                  )}

                  {existingReceipts.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {existingReceipts.map((r) => (
                        <li key={r.id} className="flex items-center justify-between text-sm bg-slate-50 rounded px-2 py-1">
                          <span className="truncate text-slate-700">{r.fileName}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveReceipt(r.id)}
                            className="text-red-600 hover:underline shrink-0 ml-2 text-xs"
                          >
                            Remover
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {pendingFiles.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {pendingFiles.map((file, index) => (
                        <li key={`${file.name}-${index}`} className="flex items-center justify-between text-sm bg-blue-50 rounded px-2 py-1">
                          <span className="truncate text-slate-700">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => removePendingFile(index)}
                            className="text-red-600 hover:underline shrink-0 ml-2 text-xs"
                          >
                            Remover
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </PanelAccessGate>
  );
}
