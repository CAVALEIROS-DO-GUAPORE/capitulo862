import { NextResponse, type NextRequest } from 'next/server';
import { getNews, updateNews, deleteNews } from '@/lib/data';
import { requireRoles, NEWS_EDITOR_ROLES } from '@/lib/panel-auth';
import type { News } from '@/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(request, NEWS_EDITOR_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, images, image, instagramUrl, authorName, authorRole } = body;

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
    if (authorName !== undefined) partial.authorName = authorName ? String(authorName).trim() : undefined;
    if (authorRole !== undefined) partial.authorRole = authorRole ? String(authorRole).trim() : undefined;

    const updated = await updateNews(id, partial);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(request, NEWS_EDITOR_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const news = await getNews();
    if (!news.find((n) => n.id === id)) {
      return NextResponse.json({ error: 'Notícia não encontrada' }, { status: 404 });
    }
    await deleteNews(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
