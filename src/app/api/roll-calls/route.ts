import { NextResponse } from 'next/server';
import { getRollCalls, getRollCallByDate, upsertRollCall } from '@/lib/data';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    if (date) {
      const one = await getRollCallByDate(date);
      return NextResponse.json(one ?? null);
    }
    const rollCalls = await getRollCalls();
    return NextResponse.json(rollCalls);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao carregar chamadas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, attendance } = body;
    if (!date || typeof date !== 'string') {
      return NextResponse.json({ error: 'Data é obrigatória' }, { status: 400 });
    }
    const payload = await upsertRollCall(date, typeof attendance === 'object' ? attendance : {});
    return NextResponse.json(payload);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao salvar chamada' }, { status: 500 });
  }
}
