import { NextResponse, type NextRequest } from 'next/server';
import { canManageFinance } from '@/lib/finance-auth';
import { getFinanceReceipts, deleteFinanceReceipt } from '@/lib/data';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; receiptId: string }> }
) {
  if (!(await canManageFinance(request))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id, receiptId } = await params;

  try {
    const receipts = await getFinanceReceipts(id);
    if (!receipts.find((r) => r.id === receiptId)) {
      return NextResponse.json({ error: 'Comprovante não encontrado' }, { status: 404 });
    }

    await deleteFinanceReceipt(receiptId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao excluir comprovante' },
      { status: 500 }
    );
  }
}
