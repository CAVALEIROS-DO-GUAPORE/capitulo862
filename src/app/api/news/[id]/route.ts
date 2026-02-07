import { NextResponse } from 'next/server';
import { getNews, saveNews } from '@/lib/data';
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
    const index = news.findIndex((n) => n.id === id);
    if (index === -1) return NextResponse.json({ error: 'Notícia não encontrada' }, { status: 404 });

    if (title !== undefined) news[index].title = String(title).trim();
    if (description !== undefined) news[index].description = String(description).trim();
    if (images !== undefined) news[index].images = Array.isArray(images) ? images : [];
    if (image !== undefined) news[index].image = image ? String(image).trim() : undefined;
    if (instagramUrl !== undefined) news[index].instagramUrl = instagramUrl ? String(instagramUrl).trim() : undefined;

    await saveNews(news);
    return NextResponse.json(news[index]);
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
    const filtered = news.filter((n) => n.id !== id);
    if (filtered.length === news.length) {
      return NextResponse.json({ error: 'Notícia não encontrada' }, { status: 404 });
    }
    await saveNews(filtered);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
