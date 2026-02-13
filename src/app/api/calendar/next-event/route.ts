import { NextResponse } from 'next/server';
import { getNextCalendarEvent, getCalendarEvents } from '@/lib/data';

export async function GET() {
  try {
    const event = await getNextCalendarEvent();
    return NextResponse.json(event ?? null);
  } catch {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const all = await getCalendarEvents();
      const next = all
        .filter((e) => e.category !== 'atividades_mensais' && e.date >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
      return NextResponse.json(next ?? null);
    } catch {
      return NextResponse.json(null);
    }
  }
}
