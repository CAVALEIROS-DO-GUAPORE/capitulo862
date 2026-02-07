import { NextResponse } from 'next/server';
import { getFinanceEntries, updateFinanceEntry, deleteFinanceEntry } from '@/lib/data';
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
    const existing = entries.find((e) => e.id === id);
    if (!existing) {
      return NextResponse.json({ error: 'Movimentação não encontrada' }, { status: 404 });
    }

    const partial: Partial<FinanceEntry> = {};
    if (type !== undefined) partial.type = type === 'saida' ? 'saida' : 'entrada';
    if (amount !== undefined) {
      const value = parseFloat(amount);
      partial.amount = (partial.type ?? existing.type) === 'saida' ? -Math.abs(value) : Math.abs(value);
    }
    if (description !== undefined) partial.description = String(description).trim();
    if (date !== undefined) partial.date = String(date);

    const updated = await updateFinanceEntry(id, partial);
    return NextResponse.json(updated);
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
    if (!entries.find((e) => e.id === id)) {
      return NextResponse.json({ error: 'Movimentação não encontrada' }, { status: 404 });
    }
    await deleteFinanceEntry(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
