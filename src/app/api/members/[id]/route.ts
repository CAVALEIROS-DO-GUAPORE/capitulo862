import { NextResponse } from 'next/server';
import { getMembers, updateMember, deleteMember } from '@/lib/data';
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
    const { name, role, category, order, photo, phone, identifier } = body;

    const members = await getMembers();
    if (!members.find((m) => m.id === id)) {
      return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
    }

    const partial: Partial<Member> = {};
    if (name !== undefined) partial.name = String(name).trim();
    if (role !== undefined) partial.role = String(role).trim();
    if (category !== undefined) partial.category = category as Member['category'];
    if (order !== undefined) partial.order = Number(order);
    if (photo !== undefined) partial.photo = photo || undefined;
    if (phone !== undefined) partial.phone = phone ? String(phone).trim() : undefined;
    if (identifier !== undefined && identifier !== null && identifier !== '') {
      const idNum = Number(identifier);
      partial.identifier = Number.isNaN(idNum) ? 0 : idNum;
    }
    if (body.additionalRoles !== undefined) {
      partial.additionalRoles = Array.isArray(body.additionalRoles)
        ? body.additionalRoles
          .filter((x: unknown) => x && typeof x === 'object' && 'category' in x && 'role' in x)
          .map((x: { category: string; role: string }) => ({ category: x.category as Member['category'], role: String(x.role).trim() }))
        : [];
    }

    const updated = await updateMember(id, partial);
    return NextResponse.json(updated);
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
    if (!members.find((m) => m.id === id)) {
      return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
    }
    await deleteMember(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
