import { NextResponse } from 'next/server';
import { getFinanceEntries, saveFinanceEntries } from '@/lib/data';
import type { FinanceEntry } from '@/types';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, amount, description, date } = body;

    const entries = await getFinanceEntries();
    const index = entries.findIndex((e) => e.id === id);
    if (index === -1) return NextResponse.json({ error: 'Movimentação não encontrada' }, { status: 404 });

    if (type !== undefined) entries[index].type = type === 'saida' ? 'saida' : 'entrada';
    if (amount !== undefined) {
      const value = parseFloat(amount);
      entries[index].amount = entries[index].type === 'saida' ? -Math.abs(value) : Math.abs(value);
    }
    if (description !== undefined) entries[index].description = String(description).trim();
    if (date !== undefined) entries[index].date = String(date);

    await saveFinanceEntries(entries);
    return NextResponse.json(entries[index]);
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
    const entries = await getFinanceEntries();
    const filtered = entries.filter((e) => e.id !== id);
    if (filtered.length === entries.length) {
      return NextResponse.json({ error: 'Movimentação não encontrada' }, { status: 404 });
    }
    await saveFinanceEntries(filtered);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
