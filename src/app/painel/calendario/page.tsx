'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useDialogs } from '@/components/DialogsProvider';
import type { CalendarEvent, CalendarEventCategory } from '@/types';

const EVENT_TYPES = [
  { value: 'ritualistica', label: 'Ritualística' },
  { value: 'evento', label: 'Evento' },
  { value: 'reuniao', label: 'Reunião' },
  { value: 'outro', label: 'Outro' },
];

type TabCategory = CalendarEventCategory;
const TAB_EVENTO: TabCategory = 'evento';
const TAB_ATIVIDADES: TabCategory = 'atividades_mensais';

export default function PainelCalendarioPage() {
  const { confirm, toast } = useDialogs();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabCategory>(TAB_EVENTO);
  const [modal, setModal] = useState<'add' | 'edit' | null>(null);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    type: 'evento' as CalendarEvent['type'],
    startTime: '',
    dateEnd: '',
    enviado: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canManage = user?.role && ['admin', 'mestre_conselheiro', 'primeiro_conselheiro'].includes(user.role);

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const loadEvents = useCallback(function loadEvents() {
    fetch('/api/calendar')
      .then((r) => r.json())
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('calendar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, () => loadEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadEvents]);

  const isEvent = (e: CalendarEvent) => (e.category || 'evento') === 'evento';
  const isActivity = (e: CalendarEvent) => e.category === 'atividades_mensais';
  const eventList = events.filter(isEvent);
  const activityList = events.filter(isActivity);

  function openAddEvent() {
    setEditing(null);
    setForm({
      title: '',
      description: '',
      date: new Date().toISOString().slice(0, 10),
      type: 'evento',
      startTime: '',
      dateEnd: '',
      enviado: false,
    });
    setModal('add');
    setError('');
  }

  function openAddActivity() {
    setEditing(null);
    setForm({
      title: '',
      description: '',
      date: new Date().toISOString().slice(0, 10),
      type: 'outro',
      startTime: '',
      dateEnd: '',
      enviado: false,
    });
    setModal('add');
    setError('');
  }

  function openEdit(e: CalendarEvent) {
    setEditing(e);
    setForm({
      title: e.title,
      description: e.description || '',
      date: e.date,
      type: e.type,
      startTime: e.startTime || '',
      dateEnd: e.dateEnd || '',
      enviado: e.enviado ?? false,
    });
    setModal('edit');
    setError('');
  }

  function closeModal() {
    setModal(null);
    setEditing(null);
  }

  const isActivityForm = editing ? isActivity(editing) : tab === TAB_ATIVIDADES;

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        date: form.date,
        type: form.type,
      };
      if (isActivityForm) {
        payload.category = 'atividades_mensais';
        payload.dateEnd = form.dateEnd || undefined;
        payload.enviado = form.enviado;
      } else {
        payload.category = 'evento';
        payload.startTime = form.startTime.trim() || undefined;
      }
      if (editing) {
        const res = await fetch(`/api/calendar/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Erro ao atualizar');
        }
      } else {
        const res = await fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Erro ao cadastrar');
        }
      }
      loadEvents();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleEnviado(e: CalendarEvent) {
    try {
      const res = await fetch(`/api/calendar/${e.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enviado: !e.enviado }),
      });
      if (!res.ok) throw new Error('Erro ao atualizar');
      loadEvents();
      toast(e.enviado ? 'Marcado como não enviado.' : 'Marcado como enviado.', 'success');
    } catch {
      toast('Erro ao atualizar.', 'error');
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Excluir',
      message: 'Excluir este item?',
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/calendar/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao excluir');
      loadEvents();
      toast('Excluído.', 'success');
    } catch {
      toast('Erro ao excluir.', 'error');
    }
  }

  const sortedEvents = [...eventList].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const sortedActivities = [...activityList].sort((a, b) => new Date((a.dateEnd || a.date)).getTime() - new Date((b.dateEnd || b.date)).getTime());

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Calendário</h1>
      </div>
      <p className="text-slate-600 mb-6">
        Eventos do capítulo e atividades mensais obrigatórias (edital).
      </p>

      <div className="flex gap-0 sm:gap-2 border-b border-slate-200 mb-6">
        <button
          type="button"
          onClick={() => setTab(TAB_EVENTO)}
          className={`flex-1 sm:flex-none min-w-0 px-3 sm:px-4 py-3 sm:py-2 rounded-t-lg text-sm font-medium text-center transition-colors ${tab === TAB_EVENTO ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Eventos
        </button>
        <button
          type="button"
          onClick={() => setTab(TAB_ATIVIDADES)}
          className={`flex-1 sm:flex-none min-w-0 px-3 sm:px-4 py-3 sm:py-2 rounded-t-lg text-sm font-medium text-center transition-colors ${tab === TAB_ATIVIDADES ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          Atividades mensais
        </button>
      </div>

      {loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : tab === TAB_EVENTO ? (
        <div>
          <div className="flex justify-end mb-4">
            {canManage && (
              <button
                onClick={openAddEvent}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                + Novo Evento
              </button>
            )}
          </div>
          <div className="space-y-4">
            {sortedEvents.map((e) => (
              <div
                key={e.id}
                className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="font-bold text-blue-800">{e.title}</h3>
                  <p className="text-slate-500 text-sm capitalize">{e.type}</p>
                  <p className="text-slate-600 text-sm mt-1">
                    {new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                    {e.startTime && ` · ${e.startTime}`}
                  </p>
                  {e.description && <p className="text-slate-600 text-sm mt-1">{e.description}</p>}
                </div>
                {canManage && (
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => openEdit(e)} className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm">Editar</button>
                    <button onClick={() => handleDelete(e.id)} className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm">Excluir</button>
                  </div>
                )}
              </div>
            ))}
            {eventList.length === 0 && (
              <p className="py-8 text-center text-slate-500 bg-white rounded-lg border">Nenhum evento cadastrado.</p>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex justify-end mb-4">
            {canManage && (
              <button
                onClick={openAddActivity}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              >
                + Nova Atividade
              </button>
            )}
          </div>
          <div className="space-y-4">
            {sortedActivities.map((a) => (
              <div
                key={a.id}
                className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <h3 className="font-bold text-blue-800">{a.title}</h3>
                  {a.description && <p className="text-slate-600 text-sm mt-1">{a.description}</p>}
                  <p className="text-slate-500 text-sm mt-2">
                    Início: {new Date(a.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                    {a.dateEnd && ` · Enviar até: ${new Date(a.dateEnd + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {canManage && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={a.enviado ?? false}
                        onChange={() => handleToggleEnviado(a)}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm text-slate-600">Enviado</span>
                    </label>
                  )}
                  {canManage && (
                    <>
                      <button onClick={() => openEdit(a)} className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded text-sm">Editar</button>
                      <button onClick={() => handleDelete(a.id)} className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm">Excluir</button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {activityList.length === 0 && (
              <p className="py-8 text-center text-slate-500 bg-white rounded-lg border">Nenhuma atividade mensal cadastrada.</p>
            )}
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-blue-800 mb-4">
              {editing ? (isActivityForm ? 'Editar Atividade' : 'Editar Evento') : (isActivityForm ? 'Nova Atividade' : 'Novo Evento')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-700 text-sm mb-1">{isActivityForm ? 'Nome da atividade' : 'Título'} *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-slate-700 text-sm mb-1">Dia inicial *</label>
                <input
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
              {isActivityForm ? (
                <div>
                  <label className="block text-slate-700 text-sm mb-1">Último dia para enviar *</label>
                  <input
                    type="date"
                    required
                    value={form.dateEnd}
                    onChange={(e) => setForm((f) => ({ ...f, dateEnd: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-slate-700 text-sm mb-1">Horário (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 19h"
                    value={form.startTime}
                    onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              )}
              {!isActivityForm && (
                <div>
                  <label className="block text-slate-700 text-sm mb-1">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CalendarEvent['type'] }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {EVENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-slate-700 text-sm mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg resize-none"
                />
              </div>
              {isActivityForm && editing && (
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.enviado}
                      onChange={(e) => setForm((f) => ({ ...f, enviado: e.target.checked }))}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">Atividade já foi enviada</span>
                  </label>
                </div>
              )}
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-700">Cancelar</button>
                <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
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
