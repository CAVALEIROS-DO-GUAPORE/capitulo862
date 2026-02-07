import { NextResponse } from 'next/server';
import { getMembers, saveMembers, generateId } from '@/lib/data';
import type { Member } from '@/types';

export async function GET() {
  try {
    const members = await getMembers();
    return NextResponse.json(members);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao carregar membros' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, role, category, order, photo, phone } = body;

    if (!name || !role || !category) {
      return NextResponse.json({ error: 'Nome, cargo e categoria são obrigatórios' }, { status: 400 });
    }

    const members = await getMembers();
    const newMember: Member = {
      id: generateId(),
      name: String(name).trim(),
      role: String(role).trim(),
      category: category as Member['category'],
      order: typeof order === 'number' ? order : members.length + 1,
      photo: photo || undefined,
      phone: phone ? String(phone).trim() : undefined,
    };

    members.push(newMember);
    await saveMembers(members);

    return NextResponse.json(newMember);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao cadastrar membro' }, { status: 500 });
  }
}
