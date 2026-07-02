import { NextResponse, type NextRequest } from 'next/server';
import { downloadRaffleReceiptFile, getRaffleById, getRaffleSaleById } from '@/lib/data';
import { requireRaffleAuditor } from '@/lib/raffles-auth';
import { isValidUuid } from '@/lib/raffles-security';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; saleId: string }> }
) {
  const auditor = await requireRaffleAuditor(request);
  if (!auditor.ok) {
    return NextResponse.json(
      { error: auditor.status === 401 ? 'Não autorizado' : 'Sem permissão' },
      { status: auditor.status }
    );
  }

  const { id, saleId } = await params;
  if (!isValidUuid(id) || !isValidUuid(saleId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const raffle = await getRaffleById(id);
  if (!raffle) {
    return NextResponse.json({ error: 'Sorteio não encontrado' }, { status: 404 });
  }

  try {
    const sale = await getRaffleSaleById(id, saleId);
    if (!sale) {
      return NextResponse.json({ error: 'Venda não encontrada' }, { status: 404 });
    }
    if (!sale.receiptPath) {
      return NextResponse.json({ error: 'Comprovante não disponível' }, { status: 404 });
    }

    const { buffer, contentType } = await downloadRaffleReceiptFile(sale.receiptPath);
    const fileName = sale.receiptFileName || 'comprovante';

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (err) {
    console.error('[GET /api/raffles/[id]/sales/[saleId]/receipt]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao baixar comprovante' },
      { status: 500 }
    );
  }
}
