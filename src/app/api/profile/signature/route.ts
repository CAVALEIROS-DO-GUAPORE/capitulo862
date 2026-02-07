import { NextResponse, type NextRequest } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import sharp from 'sharp';

const BUCKET = 'signatures';
const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const WHITE_THRESHOLD = 248;

function extractStoragePath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const match = url.pathname.match(/\/storage\/v1\/object\/public\/signatures\/(.+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

async function removeWhiteBackground(buffer: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels ?? 4;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
      data[i + 3] = 0;
    }
  }
  return sharp(Buffer.from(data), {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png()
    .toBuffer();
}

export async function POST(request: NextRequest) {
  const supabase = createAuthenticatedClient(request);
  if (!supabase) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Envie uma imagem válida (JPEG, PNG, etc.)' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Imagem deve ter no máximo 2MB' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());

    const { data: profile } = await admin
      .from('profiles')
      .select('signature_url')
      .eq('id', user.id)
      .single();

    let processedBuffer: Buffer;
    try {
      processedBuffer = await removeWhiteBackground(buffer);
    } catch {
      processedBuffer = buffer;
    }

    const path = `${user.id}/${Date.now()}-signature.png`;
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, processedBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message === 'The resource already exists' ? 'Crie o bucket "signatures" no Supabase Storage.' : uploadError.message },
        { status: 500 }
      );
    }

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    if (profile?.signature_url) {
      try {
        const oldPath = extractStoragePath(profile.signature_url);
        if (oldPath) {
          await admin.storage.from(BUCKET).remove([oldPath]);
        }
      } catch {
        // ignora erro ao excluir arquivo antigo
      }
    }

    const { error: updateError } = await admin
      .from('profiles')
      .update({ signature_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message === 'column "signature_url" does not exist' ? 'Adicione a coluna signature_url na tabela profiles (veja instruções no projeto).' : updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ signatureUrl: publicUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao enviar assinatura' },
      { status: 500 }
    );
  }
}
