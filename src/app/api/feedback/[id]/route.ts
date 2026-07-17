import { NextResponse, type NextRequest } from 'next/server';
import { deleteChapterFeedback } from '@/lib/data';
import { requireFeedbackViewer } from '@/lib/feedback-auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireFeedbackViewer(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Não autorizado' : 'Sem permissão' },
      { status: auth.status }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
    const deleted = await deleteChapterFeedback(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Manifestação não encontrada' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/feedback/:id]', err);
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
