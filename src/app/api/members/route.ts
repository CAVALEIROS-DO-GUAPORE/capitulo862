import { NextResponse, type NextRequest } from 'next/server';
import { enrichMembersWithPhotos } from '@/lib/member-photos';
import { getMembers, insertMember } from '@/lib/data';
import { requireRoles, MEMBERS_EDITOR_ROLES } from '@/lib/panel-auth';
import type { Member } from '@/types';

export async function GET() {
  try {
    const members = await enrichMembersWithPhotos(await getMembers());
    return NextResponse.json(members);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao carregar membros' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireRoles(request, MEMBERS_EDITOR_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { name, role, category, order, photo, phone, identifier, additionalRoles } = body;

    if (!name || !role || !category) {
      return NextResponse.json({ error: 'Nome, cargo e categoria são obrigatórios' }, { status: 400 });
    }

    const members = await getMembers();
    const extra = Array.isArray(additionalRoles)
      ? additionalRoles
        .filter((x: unknown) => x && typeof x === 'object' && 'category' in x && 'role' in x)
        .map((x: { category: string; role: string }) => ({ category: x.category as Member['category'], role: String(x.role).trim() }))
      : [];
    const idNum = identifier !== undefined && identifier !== null && identifier !== '' ? Number(identifier) : 0;
    const newMember = await insertMember({
      name: String(name).trim(),
      role: String(role).trim(),
      category: category as Member['category'],
      order: typeof order === 'number' ? order : members.length + 1,
      photo: photo || undefined,
      phone: phone ? String(phone).trim() : undefined,
      identifier: Number.isNaN(idNum) ? 0 : idNum,
      additionalRoles: extra,
    });

    return NextResponse.json(newMember);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao cadastrar membro';
    console.error('[members POST]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
