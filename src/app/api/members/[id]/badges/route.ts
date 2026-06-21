import { NextResponse, type NextRequest } from 'next/server';
import { canManageMemberBadges } from '@/lib/badges-auth';
import { getMembers, updateMember } from '@/lib/data';
import { normalizeMemberBadges } from '@/lib/member-badges';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await canManageMemberBadges(request))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { badges } = body;

    if (!Array.isArray(badges)) {
      return NextResponse.json({ error: 'Lista de emblemas inválida' }, { status: 400 });
    }

    const members = await getMembers();
    const member = members.find((m) => m.id === id);
    if (!member) {
      return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
    }

    const normalized = normalizeMemberBadges(badges.map(String));
    const updated = await updateMember(id, { badges: normalized });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('[members badges PATCH]', err);
    return NextResponse.json({ error: 'Erro ao atualizar emblemas' }, { status: 500 });
  }
}
