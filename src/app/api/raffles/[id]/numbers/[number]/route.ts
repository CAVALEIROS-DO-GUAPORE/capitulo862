import { NextResponse, type NextRequest } from 'next/server';
import { deleteRaffleSoldNumber, getRaffleById } from '@/lib/data';
import { requireRaffleAuditor } from '@/lib/raffles-auth';
import { isValidUuid } from '@/lib/raffles-security';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; number: string }> }
) {
  const auditor = await requireRaffleAuditor(request);
  if (!auditor.ok) {
    return NextResponse.json(
      { error: auditor.status === 401 ? 'Não autorizado' : 'Sem permissão' },
      { status: auditor.status }
    );
  }

  const { id, number: numberRaw } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const number = Number(numberRaw);
  if (!Number.isInteger(number) || number < 1) {
    return NextResponse.json({ error: 'Número inválido' }, { status: 400 });
  }

  const raffle = await getRaffleById(id);
  if (!raffle) {
    return NextResponse.json({ error: 'Sorteio não encontrado' }, { status: 404 });
  }
  if (number > raffle.totalNumbers) {
    return NextResponse.json({ error: 'Número inválido para este sorteio' }, { status: 400 });
  }

  try {
    const result = await deleteRaffleSoldNumber(id, number);
    if (!result.deleted) {
      return NextResponse.json({ error: 'Número não encontrado ou não vendido' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      number,
      saleDeleted: result.saleDeleted,
    });
  } catch (err) {
    console.error('[DELETE /api/raffles/[id]/numbers/[number]]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao remover número' },
      { status: 500 }
    );
  }
}
