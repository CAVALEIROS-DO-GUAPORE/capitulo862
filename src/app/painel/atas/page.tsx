'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { InternalMinutes } from '@/types';

export default function PainelAtasPage() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [minutes, setMinutes] = useState<InternalMinutes[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<InternalMinutes | null>(null);
  const [form, setForm] = useState({ title: '', content: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<InternalMinutes | null>(null);

  const canPost = user?.role && ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao'].includes(user.role);

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const loadMinutes = useCallback(function loadMinutes() {
    fetch('/api/minutes')
      .then((r) => r.json())
      .then((data) => setMinutes(Array.isArray(data) ? data : []))
      .catch(() => setMinutes([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadMinutes();
  }, [loadMinutes]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('minutes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'minutes' }, () => loadMinutes())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadMinutes]);

  function openAdd() {
    setEditing(null);
    setForm({ title: '', content: '' });
    setModal('add');
    setError('');
  }

  function openEdit(m: InternalMinutes) {
    setEditing(m);
    setForm({ title: m.title, content: m.content });
    setModal('edit');
    setError('');
  }

  function closeModal() {
    setModal(null);
    setEditing(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editing) {
        const res = await fetch(`/api/minutes/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Erro ao atualizar');
        }
      } else {
        const res = await fetch('/api/minutes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Erro ao publicar');
        }
      }
      loadMinutes();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta ata?')) return;
    try {
      const res = await fetch(`/api/minutes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      loadMinutes();
      setViewing(null);
    } catch {
      alert('Erro ao excluir');
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

  const sorted = [...minutes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Atas Internas</h1>
        {canPost && (
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            + Nova Ata
          </button>
        )}
      </div>
      <p className="text-slate-600 mb-6">
        Atas das reuniões e assembleias.
      </p>

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            {sorted.map((m) => (
              <div
                key={m.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  viewing?.id === m.id
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-slate-200 hover:border-blue-200'
                }`}
                onClick={() => setViewing(m)}
              >
                <h3 className="font-bold text-blue-800">{m.title}</h3>
                <p className="text-slate-500 text-sm">{formatDate(m.createdAt)}</p>
              </div>
            ))}
            {minutes.length === 0 && (
              <p className="py-8 text-center text-slate-500 bg-white rounded-lg border">Nenhuma ata publicada.</p>
            )}
          </div>

          <div>
            {viewing ? (
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
                <div className="flex justify-between items-start gap-4 mb-4">
                  <h2 className="text-lg font-bold text-blue-800">{viewing.title}</h2>
                  {canPost && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => openEdit(viewing)}
                        className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(viewing.id)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                      >
                        Excluir
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-slate-500 text-sm mb-4">{formatDate(viewing.createdAt)}</p>
                <div className="text-slate-700 whitespace-pre-wrap">{viewing.content}</div>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-8 text-center text-slate-500">
                Selecione uma ata para visualizar.
              </div>
            )}
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-blue-800 mb-4">
              {editing ? 'Editar Ata' : 'Nova Ata'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-700 text-sm mb-1">Título *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 text-sm mb-1">Conteúdo *</label>
                <textarea
                  required
                  rows={8}
                  value={form.content}
                  onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none"
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
