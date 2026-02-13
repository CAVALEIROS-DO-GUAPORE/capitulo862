import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getMembers, insertMember } from '@/lib/data';
import type { Member } from '@/types';

export async function GET() {
  try {
    const members = await getMembers();
    const admin = createAdminClient();
    const userIds = members.map((m) => m.userId).filter(Boolean) as string[];
    const avatarByUserId = new Map<string, string>();
    const avatarByName = new Map<string, string>();

    if (userIds.length > 0) {
      const { data: profilesById } = await admin
        .from('profiles')
        .select('id, avatar_url')
        .in('id', userIds);
      for (const p of profilesById ?? []) {
        if (p.avatar_url) avatarByUserId.set(p.id, p.avatar_url);
      }
    }

    const membersWithoutPhoto = members.filter((m) => !m.userId || !avatarByUserId.get(m.userId));
    if (membersWithoutPhoto.length > 0) {
      const { data: profilesWithAvatar } = await admin
        .from('profiles')
        .select('name, avatar_url')
        .not('avatar_url', 'is', null);
      for (const p of profilesWithAvatar ?? []) {
        const name = (p.name || '').trim();
        if (name && p.avatar_url) avatarByName.set(name.toLowerCase(), p.avatar_url);
      }
    }

    const enriched = members.map((m) => {
      const byUser = m.userId ? avatarByUserId.get(m.userId) : undefined;
      if (byUser) return { ...m, photo: byUser };
      const byName = (m.name || '').trim().toLowerCase();
      const fromProfile = avatarByName.get(byName);
      if (fromProfile) return { ...m, photo: fromProfile };
      return m;
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao carregar membros' }, { status: 500 });
  }
}

export async function POST(request: Request) {
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
