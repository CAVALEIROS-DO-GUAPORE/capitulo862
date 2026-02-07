import { NextResponse } from 'next/server';
import { getCandidates, deleteCandidate } from '@/lib/data';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const candidates = await getCandidates();
    if (!candidates.find((c) => c.id === id)) {
      return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
    }
    await deleteCandidate(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
