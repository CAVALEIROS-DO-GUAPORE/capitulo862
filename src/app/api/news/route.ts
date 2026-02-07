import { NextResponse } from 'next/server';
import { getNews, saveNews, generateId } from '@/lib/data';
import type { News } from '@/types';

export async function GET() {
  try {
    const news = await getNews();
    return NextResponse.json(news);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao carregar notícias' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, images } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Título e descrição são obrigatórios' }, { status: 400 });
    }

    const news = await getNews();
    const newItem: News = {
      id: generateId(),
      title: String(title).trim(),
      description: String(description).trim(),
      images: Array.isArray(images) ? images : [],
      createdAt: new Date().toISOString(),
    };

    news.push(newItem);
    await saveNews(news);

    return NextResponse.json(newItem);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao publicar notícia' }, { status: 500 });
  }
}
