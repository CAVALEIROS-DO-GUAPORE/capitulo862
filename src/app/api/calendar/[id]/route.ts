import { NextResponse } from 'next/server';
import { getCalendarEvents, updateCalendarEvent, deleteCalendarEvent } from '@/lib/data';
import type { CalendarEvent } from '@/types';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, date, type } = body;

    const events = await getCalendarEvents();
    if (!events.find((e) => e.id === id)) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }

    const partial: Partial<CalendarEvent> = {};
    if (title !== undefined) partial.title = String(title).trim();
    if (description !== undefined) partial.description = String(description).trim();
    if (date !== undefined) partial.date = String(date);
    if (type !== undefined) partial.type = ['ritualistica', 'evento', 'reuniao', 'outro'].includes(type) ? type : undefined;

    const updated = await updateCalendarEvent(id, partial);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
