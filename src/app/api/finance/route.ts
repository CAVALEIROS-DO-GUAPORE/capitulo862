import { NextResponse } from 'next/server';
import { getFinanceEntries, insertFinanceEntry } from '@/lib/data';
import type { FinanceEntry } from '@/types';

export async function GET() {
  try {
    const entries = await getFinanceEntries();
    return NextResponse.json(entries);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao carregar movimentações' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, amount, description, date } = body;

    if (!type || amount === undefined || amount === null) {
      return NextResponse.json({ error: 'Tipo, valor e data são obrigatórios' }, { status: 400 });
    }

    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
    }

    const newEntry = await insertFinanceEntry({
      type: type === 'saida' ? 'saida' : 'entrada',
      amount: type === 'saida' ? -Math.abs(value) : Math.abs(value),
      description: description ? String(description).trim() : '',
      date: date ? String(date).slice(0, 10) : new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(newEntry);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao lançar movimentação' }, { status: 500 });
  }
}
