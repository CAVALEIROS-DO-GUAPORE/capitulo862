import { NextResponse } from 'next/server';
import { getNews, insertNews } from '@/lib/data';
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
    const { title, description, images, image, instagramUrl } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Título e descrição são obrigatórios' }, { status: 400 });
    }

    const newItem = await insertNews({
      title: String(title).trim(),
      description: String(description).trim(),
      image: image ? String(image).trim() : undefined,
      instagramUrl: instagramUrl ? String(instagramUrl).trim() : undefined,
      images: Array.isArray(images) ? images : image ? [image] : [],
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json(newItem);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao publicar notícia' }, { status: 500 });
  }
}
