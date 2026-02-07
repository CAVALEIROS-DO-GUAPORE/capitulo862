import { NextResponse } from 'next/server';
import { getCalendarEvents, saveCalendarEvents, generateId } from '@/lib/data';
import type { CalendarEvent } from '@/types';

export async function GET() {
  try {
    const events = await getCalendarEvents();
    return NextResponse.json(events);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao carregar calendário' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, date, type } = body;

    if (!title || !date) {
      return NextResponse.json({ error: 'Título e data são obrigatórios' }, { status: 400 });
    }

    const events = await getCalendarEvents();
    const newEvent: CalendarEvent = {
      id: generateId(),
      title: String(title).trim(),
      description: description ? String(description).trim() : undefined,
      date: String(date),
      type: ['ritualistica', 'evento', 'reuniao', 'outro'].includes(type) ? type : 'outro',
    };

    events.push(newEvent);
    await saveCalendarEvents(events);

    return NextResponse.json(newEvent);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao cadastrar evento' }, { status: 500 });
  }
}
