import { NextResponse } from 'next/server';
import { getMinutes, saveMinutes } from '@/lib/data';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content } = body;

    const minutes = await getMinutes();
    const index = minutes.findIndex((m) => m.id === id);
    if (index === -1) return NextResponse.json({ error: 'Ata não encontrada' }, { status: 404 });

    if (title !== undefined) minutes[index].title = String(title).trim();
    if (content !== undefined) minutes[index].content = String(content).trim();

    await saveMinutes(minutes);
    return NextResponse.json(minutes[index]);
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
    const minutes = await getMinutes();
    const filtered = minutes.filter((m) => m.id !== id);
    if (filtered.length === minutes.length) {
      return NextResponse.json({ error: 'Ata não encontrada' }, { status: 404 });
    }
    await saveMinutes(filtered);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
