import { NextResponse } from 'next/server';
import { getCalendarEvents, insertCalendarEvent } from '@/lib/data';
import type { CalendarEvent } from '@/types';

export async function GET() {
  try {
    const events = await getCalendarEvents();
    return NextResponse.json(events);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao carregar calendário' }, { status: 500 });
  }
}

function normalizeDate(dateStr: unknown): string {
  if (!dateStr || typeof dateStr !== 'string') return '';
  const s = String(dateStr).trim();
  const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return s;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, date, type } = body;

    if (!title || !date) {
      return NextResponse.json({ error: 'Título e data são obrigatórios' }, { status: 400 });
    }

    const dateNorm = normalizeDate(date) || String(date).trim();
    if (!dateNorm) {
      return NextResponse.json({ error: 'Data inválida. Use o formato DD/MM/AAAA ou AAAA-MM-DD.' }, { status: 400 });
    }

    const newEvent = await insertCalendarEvent({
      title: String(title).trim(),
      description: description ? String(description).trim() : undefined,
      date: dateNorm,
      type: ['ritualistica', 'evento', 'reuniao', 'outro'].includes(type) ? type : 'outro',
    });

    return NextResponse.json(newEvent);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao cadastrar evento';
    console.error('[calendar POST]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
