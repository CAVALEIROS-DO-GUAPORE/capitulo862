import { NextResponse, type NextRequest } from 'next/server';
import { deleteEdital } from '@/lib/data';
import { requireEditalManager } from '@/lib/editais-auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireEditalManager(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Não autorizado' : 'Sem permissão' },
      { status: auth.status }
    );
  }

  try {
    const { id } = await params;
    const deleted = await deleteEdital(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Edital não encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/editais/[id]]', err);
    return NextResponse.json({ error: 'Erro ao excluir edital' }, { status: 500 });
  }
}
