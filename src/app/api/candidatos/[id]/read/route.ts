import { NextResponse, type NextRequest } from 'next/server';
import { canViewCandidates } from '@/lib/candidatos-auth';
import { getCandidates, updateCandidate } from '@/lib/data';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await canViewCandidates(request))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { reader } = body;

    if (!reader || !['mc', 'first_counselor'].includes(reader)) {
      return NextResponse.json({ error: 'Leitor inválido' }, { status: 400 });
    }

    const candidates = await getCandidates();
    const candidate = candidates.find((c) => c.id === id);
    if (!candidate) {
      return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
    }

    const partial = reader === 'mc' ? { readByMc: true } : { readByFirstCounselor: true };
    await updateCandidate(id, partial);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}
