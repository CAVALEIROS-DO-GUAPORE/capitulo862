'use client';

import { useEffect, useState } from 'react';
import type { FinanceEntry } from '@/types';

export default function PainelFinancasPage() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [form, setForm] = useState({
    type: 'entrada' as 'entrada' | 'saida',
    amount: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canManage = user?.role && ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'tesoureiro'].includes(user.role);

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  function loadEntries() {
    fetch('/api/finance')
      .then((r) => r.json())
      .then((data) => setEntries(Array.isArray(data) ? data : []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadEntries();
  }, []);

  const balance = entries.reduce((sum, e) => sum + e.amount, 0);

  function openAdd() {
    setEditing(null);
    setForm({
      type: 'entrada',
      amount: '',
      description: '',
      date: new Date().toISOString().slice(0, 10),
    });
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
    setModal('edit');
    setError('');
  }

  function closeModal() {
    setModal(null);
    setEditing(null);
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
      if (editing) {
        const res = await fetch(`/api/finance/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Erro ao atualizar');
        }
      } else {
        const res = await fetch('/api/finance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Erro ao lançar');
        }
      }
      loadEntries();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta movimentação?')) return;
    try {
      const res = await fetch(`/api/finance/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      loadEntries();
    } catch {
      alert('Erro ao excluir');
    }
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Finanças</h1>
        {canManage && (
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            + Lançar Movimentação
          </button>
        )}
      </div>
      <p className="text-slate-600 mb-6">
        Tesoureiro, MC e 1º Conselheiro podem lançar, editar e excluir. Todos podem ver saldo e movimentações.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h3 className="text-slate-600 text-sm mb-1">Saldo do Capítulo</h3>
          <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-800' : 'text-red-600'}`}>
            R$ {balance.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="py-3 px-4 text-slate-600 font-medium">Data</th>
                <th className="py-3 px-4 text-slate-600 font-medium">Descrição</th>
                <th className="py-3 px-4 text-slate-600 font-medium">Tipo</th>
                <th className="py-3 px-4 text-slate-600 font-medium text-right">Valor</th>
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
                  <td className="py-3 px-4 text-right font-medium">
                    <span className={e.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {e.amount >= 0 ? '+' : ''}R$ {Math.abs(e.amount).toFixed(2).replace('.', ',')}
                    </span>
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
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
  );
}
