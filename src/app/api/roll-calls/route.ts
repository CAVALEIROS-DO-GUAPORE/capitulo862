import { NextResponse } from 'next/server';
import { getRollCalls, saveRollCalls, generateId } from '@/lib/data';
import type { RollCall } from '@/types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const rollCalls = await getRollCalls();
    if (date) {
      const one = rollCalls.find((r) => r.date === date);
      return NextResponse.json(one ?? null);
    }
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
    const rollCalls = await getRollCalls();
    const existing = rollCalls.find((r) => r.date === date);
    const payload: RollCall = existing
      ? { ...existing, attendance: typeof attendance === 'object' ? attendance : existing.attendance }
      : {
          id: generateId(),
          date,
          attendance: typeof attendance === 'object' ? attendance : {},
          createdAt: new Date().toISOString(),
          authorId: 'system',
        };
    if (existing) {
      const idx = rollCalls.findIndex((r) => r.date === date);
      rollCalls[idx] = payload;
    } else {
      rollCalls.push(payload);
    }
    await saveRollCalls(rollCalls);
    return NextResponse.json(payload);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao salvar chamada' }, { status: 500 });
  }
}
