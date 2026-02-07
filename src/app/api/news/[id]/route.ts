import { NextResponse } from 'next/server';
import { getNews, updateNews, deleteNews } from '@/lib/data';
import type { News } from '@/types';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, images, image, instagramUrl } = body;

    const news = await getNews();
    if (!news.find((n) => n.id === id)) {
      return NextResponse.json({ error: 'Notícia não encontrada' }, { status: 404 });
    }

    const partial: Partial<News> = {};
    if (title !== undefined) partial.title = String(title).trim();
    if (description !== undefined) partial.description = String(description).trim();
    if (images !== undefined) partial.images = Array.isArray(images) ? images : [];
    if (image !== undefined) partial.image = image ? String(image).trim() : undefined;
    if (instagramUrl !== undefined) partial.instagramUrl = instagramUrl ? String(instagramUrl).trim() : undefined;

    const updated = await updateNews(id, partial);
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
    const news = await getNews();
    if (!news.find((n) => n.id === id)) {
      return NextResponse.json({ error: 'Notícia não encontrada' }, { status: 404 });
    }
    await deleteNews(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
