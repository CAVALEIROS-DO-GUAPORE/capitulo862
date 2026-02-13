import { NextResponse } from 'next/server';
import { getUpcomingCalendarActivities, getCalendarEvents } from '@/lib/data';

export async function GET() {
  try {
    const activities = await getUpcomingCalendarActivities();
    return NextResponse.json(activities);
  } catch {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const all = await getCalendarEvents();
      const list = all
        .filter((e) => e.category === 'atividades_mensais' && !e.enviado && e.dateEnd && e.dateEnd >= today)
        .sort((a, b) => new Date(a.dateEnd || a.date).getTime() - new Date(b.dateEnd || b.date).getTime());
      return NextResponse.json(list);
    } catch {
      return NextResponse.json([]);
    }
  }
}
