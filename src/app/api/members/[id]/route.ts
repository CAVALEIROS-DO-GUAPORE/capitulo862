import { NextResponse } from 'next/server';
import { getMembers, saveMembers } from '@/lib/data';
import type { Member } from '@/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const members = await getMembers();
    const member = members.find((m) => m.id === id);
    if (!member) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
    return NextResponse.json(member);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao carregar' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, role, category, order, photo, phone } = body;

    const members = await getMembers();
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });

    if (name !== undefined) members[index].name = String(name).trim();
    if (role !== undefined) members[index].role = String(role).trim();
    if (category !== undefined) members[index].category = category as Member['category'];
    if (order !== undefined) members[index].order = Number(order);
    if (photo !== undefined) members[index].photo = photo || undefined;
    if (phone !== undefined) members[index].phone = phone ? String(phone).trim() : undefined;

    await saveMembers(members);
    return NextResponse.json(members[index]);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const members = await getMembers();
    const filtered = members.filter((m) => m.id !== id);
    if (filtered.length === members.length) {
      return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
    }
    await saveMembers(filtered);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
