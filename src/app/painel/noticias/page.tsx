'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { News } from '@/types';

export default function PainelNoticiasPage() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<News | null>(null);
  const [form, setForm] = useState({ title: '', description: '', image: '', instagramUrl: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageUploading, setImageUploading] = useState(false);

  const canPost = user?.role && ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao'].includes(user.role);

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  function loadNews() {
    fetch('/api/news')
      .then((r) => r.json())
      .then((data) => setNews(Array.isArray(data) ? data : []))
      .catch(() => setNews([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadNews();
  }, []);

  function openAdd() {
    setEditing(null);
    setForm({ title: '', description: '', image: '', instagramUrl: '' });
    setModal('add');
    setError('');
  }

  function openEdit(n: News) {
    setEditing(n);
    setForm({
      title: n.title,
      description: n.description,
      image: n.image || n.images?.[0] || '',
      instagramUrl: n.instagramUrl || '',
    });
    setModal('edit');
    setError('');
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Não autorizado');
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/news/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar');
      setForm((f) => ({ ...f, image: data.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar imagem');
    } finally {
      setImageUploading(false);
      e.target.value = '';
    }
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
        const res = await fetch(`/api/news/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            image: form.image || undefined,
            instagramUrl: form.instagramUrl || undefined,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Erro ao atualizar');
        }
      } else {
        const res = await fetch('/api/news', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            image: form.image || undefined,
            instagramUrl: form.instagramUrl || undefined,
          }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Erro ao publicar');
        }
      }
      loadNews();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta notícia?')) return;
    try {
      const res = await fetch(`/api/news/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      loadNews();
    } catch {
      alert('Erro ao excluir');
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Gerenciar Notícias</h1>
        {canPost && (
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            + Nova Notícia
          </button>
        )}
      </div>
      <p className="text-slate-600 mb-6">
        MC, 1º Conselheiro, Escrivão e Admin podem publicar, editar e excluir notícias.
      </p>

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <div className="space-y-4">
          {news.map((n) => (
            <div
              key={n.id}
              className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex gap-4 flex-1 min-w-0">
                {(n.image || n.images?.[0]) && (
                  <div className="relative w-20 h-20 shrink-0 rounded overflow-hidden bg-slate-100">
                    <Image
                      src={n.image || n.images?.[0] || ''}
                      alt={n.title}
                      fill
                      className="object-cover"
                      unoptimized={(n.image || n.images?.[0] || '').includes('supabase')}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-blue-800">{n.title}</h3>
                  <p className="text-slate-600 text-sm mt-1 line-clamp-2">{n.description}</p>
                  <p className="text-slate-400 text-xs mt-2">{formatDate(n.createdAt)}</p>
                  {n.instagramUrl && (
                    <a
                      href={n.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 text-xs hover:underline mt-1 inline-block"
                    >
                      Ver no Instagram →
                    </a>
                  )}
                </div>
              </div>
              {canPost && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => openEdit(n)}
                    className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                  >
                    Excluir
                  </button>
                </div>
              )}
            </div>
          ))}
          {news.length === 0 && (
            <p className="py-8 text-center text-slate-500 bg-white rounded-lg border">Nenhuma notícia publicada.</p>
          )}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-blue-800 mb-4">
              {editing ? 'Editar Notícia' : 'Nova Notícia'}
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
                <label className="block text-slate-700 text-sm mb-1">Descrição *</label>
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none"
                />
              </div>
              <div>
                <label className="block text-slate-700 text-sm mb-1">Imagem da notícia</label>
                {form.image && (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-100 mb-2">
                    <Image
                      src={form.image}
                      alt="Preview"
                      fill
                      className="object-contain"
                      unoptimized={form.image.includes('supabase')}
                    />
                  </div>
                )}
                <label className="inline-block px-3 py-2 border border-slate-300 rounded-lg text-sm cursor-pointer hover:bg-slate-50 disabled:opacity-50">
                  {imageUploading ? 'Enviando...' : form.image ? 'Trocar imagem' : 'Enviar imagem'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={imageUploading}
                  />
                </label>
              </div>
              <div>
                <label className="block text-slate-700 text-sm mb-1">Link do Instagram (ver notícia completa)</label>
                <input
                  type="url"
                  value={form.instagramUrl}
                  onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))}
                  placeholder="https://instagram.com/p/..."
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
