import { NextResponse, type NextRequest } from 'next/server';
import { getFinanceEntries, insertFinanceEntry } from '@/lib/data';
import { requireRoles, FINANCE_EDITOR_ROLES } from '@/lib/panel-auth';
import type { FinanceEntry } from '@/types';

export async function GET(request: NextRequest) {
  const auth = await requireRoles(request, FINANCE_EDITOR_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const ano = searchParams.get('ano');
    const mes = searchParams.get('mes');
    const data = searchParams.get('data');
    const opts: { ano?: number; mes?: number; data?: string } = {};
    if (data) opts.data = String(data).slice(0, 10);
    else if (ano) {
      opts.ano = parseInt(ano, 10);
      if (mes) opts.mes = parseInt(mes, 10);
    }
    const entries = await getFinanceEntries(opts);
    return NextResponse.json(entries);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao carregar movimentações' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRoles(request, FINANCE_EDITOR_ROLES);
  if (!auth.ok) return auth.response;

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
