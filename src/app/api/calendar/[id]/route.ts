import { NextResponse, type NextRequest } from 'next/server';
import { getCalendarEvents, updateCalendarEvent, deleteCalendarEvent } from '@/lib/data';
import { requireRoles, CALENDAR_EDITOR_ROLES } from '@/lib/panel-auth';
import type { CalendarEvent } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(request, CALENDAR_EDITOR_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, date, type, category, startTime, dateEnd, enviado } = body;

    const events = await getCalendarEvents();
    if (!events.find((e) => e.id === id)) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    const partial: Partial<CalendarEvent> = {};
    if (title !== undefined) partial.title = String(title).trim();
    if (description !== undefined) partial.description = String(description).trim();
    if (date !== undefined) partial.date = String(date).slice(0, 10);
    if (type !== undefined) partial.type = ['ritualistica', 'evento', 'reuniao', 'outro'].includes(type) ? type : undefined;
    if (category !== undefined) partial.category = category === 'atividades_mensais' ? 'atividades_mensais' : 'evento';
    if (startTime !== undefined) partial.startTime = String(startTime).trim() || undefined;
    if (dateEnd !== undefined) partial.dateEnd = dateEnd ? String(dateEnd).slice(0, 10) : undefined;
    if (enviado !== undefined) partial.enviado = Boolean(enviado);

    const updated = await updateCalendarEvent(id, partial);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(request, CALENDAR_EDITOR_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const events = await getCalendarEvents();
    if (!events.find((e) => e.id === id)) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }
    await deleteCalendarEvent(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
