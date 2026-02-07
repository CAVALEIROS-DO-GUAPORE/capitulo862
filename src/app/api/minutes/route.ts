import { NextResponse } from 'next/server';
import { getMinutes, saveMinutes, generateId } from '@/lib/data';
import type { InternalMinutes } from '@/types';

export async function GET() {
  try {
    const minutes = await getMinutes();
    return NextResponse.json(minutes);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao carregar atas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Título e conteúdo são obrigatórios' }, { status: 400 });
    }

    const minutes = await getMinutes();
    const newItem: InternalMinutes = {
      id: generateId(),
      title: String(title).trim(),
      content: String(content).trim(),
      createdAt: new Date().toISOString(),
      authorId: 'system',
    };

    minutes.push(newItem);
    await saveMinutes(minutes);

    return NextResponse.json(newItem);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao publicar ata' }, { status: 500 });
  }
}
