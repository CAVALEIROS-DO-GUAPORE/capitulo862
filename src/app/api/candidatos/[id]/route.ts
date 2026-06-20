import { NextResponse, type NextRequest } from 'next/server';
import { canEditCandidates, canViewCandidates } from '@/lib/candidatos-auth';
import { getCandidates, updateCandidate, deleteCandidate } from '@/lib/data';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await canEditCandidates(request))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id } = await params;
  let body: { sindicanciaResumo?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }

  const candidates = await getCandidates();
  if (!candidates.find((c) => c.id === id)) {
    return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
  }

  if (!('sindicanciaResumo' in body)) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  try {
    const updated = await updateCandidate(id, {
      sindicanciaResumo: body.sindicanciaResumo?.trim() || '',
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao salvar resumo' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await canEditCandidates(request))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

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
