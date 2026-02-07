import { NextResponse } from 'next/server';
import { getCalendarEvents, saveCalendarEvents } from '@/lib/data';
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
    const index = events.findIndex((e) => e.id === id);
    if (index === -1) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });

    if (title !== undefined) events[index].title = String(title).trim();
    if (description !== undefined) events[index].description = String(description).trim();
    if (date !== undefined) events[index].date = String(date);
    if (type !== undefined) events[index].type = ['ritualistica', 'evento', 'reuniao', 'outro'].includes(type) ? type : events[index].type;

    await saveCalendarEvents(events);
    return NextResponse.json(events[index]);
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
    const filtered = events.filter((e) => e.id !== id);
    if (filtered.length === events.length) {
      return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 });
    }
    await saveCalendarEvents(filtered);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
