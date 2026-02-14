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
    const message =
      err instanceof Error
        ? err.message
        : (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string')
          ? (err as { message: string }).message
          : String(err);
    console.error('[POST /api/news]', err);
    if (message.includes('Missing Supabase') || message.includes('credentials')) {
      return NextResponse.json(
        { error: 'Serviço indisponível. Verifique as variáveis de ambiente do Supabase (NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY).' },
        { status: 503 }
      );
    }
    if (err && typeof err === 'object' && 'code' in err) {
      const supabaseErr = err as { code?: string; message?: string };
      if (supabaseErr.code === '42501') {
        return NextResponse.json(
          { error: 'Sem permissão para inserir notícias. Verifique as políticas RLS no Supabase.' },
          { status: 403 }
        );
      }
      if (supabaseErr.code === '42P01') {
        return NextResponse.json(
          { error: 'Tabela news não encontrada. Execute o schema do Supabase.' },
          { status: 500 }
        );
      }
      if (supabaseErr.code === 'PGRST204') {
        return NextResponse.json(
          { error: 'Coluna ausente na tabela news. Execute no Supabase o script de supabase-migrations.sql (image, instagram_url, images).' },
          { status: 500 }
        );
      }
    }
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'development' ? message : 'Erro ao publicar notícia' },
      { status: 500 }
    );
  }
}
