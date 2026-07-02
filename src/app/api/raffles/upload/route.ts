import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { RAFFLE_IMAGES_BUCKET } from '@/lib/data';
import { canManageRaffles } from '@/lib/raffles-auth';

export async function POST(request: NextRequest) {
  if (!(await canManageRaffles(request))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Envie uma imagem válida' }, { status: 400 });
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'Imagem deve ter no máximo 5MB' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from(RAFFLE_IMAGES_BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      const msg = uploadError.message.includes('Bucket not found')
        ? 'Crie o bucket "raffle-images" no Supabase Storage (público).'
        : uploadError.message;
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const { data } = admin.storage.from(RAFFLE_IMAGES_BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao enviar imagem' },
      { status: 500 }
    );
  }
}
