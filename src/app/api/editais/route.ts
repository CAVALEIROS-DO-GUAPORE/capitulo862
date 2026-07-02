import { NextResponse, type NextRequest } from 'next/server';
import {
  EDITAL_PDFS_BUCKET,
  getEditais,
  insertEdital,
} from '@/lib/data';
import { requireEditalManager } from '@/lib/editais-auth';
import { requirePanelUser } from '@/lib/panel-auth';
import { sanitizeFileName } from '@/lib/compress-receipt';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_PDF_BYTES = 15 * 1024 * 1024;

export async function GET(request: NextRequest) {
  const auth = await requirePanelUser(request);
  if (!auth.ok) return auth.response;

  try {
    const editais = await getEditais();
    return NextResponse.json(editais);
  } catch (err) {
    console.error('[GET /api/editais]', err);
    return NextResponse.json({ error: 'Erro ao carregar editais' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireEditalManager(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? 'Não autorizado' : 'Sem permissão para publicar editais' },
      { status: auth.status }
    );
  }

  try {
    const formData = await request.formData();
    const title = String(formData.get('title') || '').trim();
    const description = String(formData.get('description') || '').trim();
    const file = formData.get('pdf');

    if (!title) {
      return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Envie o arquivo PDF do edital' }, { status: 400 });
    }
    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'PDF deve ter no máximo 15 MB' }, { status: 400 });
    }

    const mime = file.type.toLowerCase();
    const name = file.name.toLowerCase();
    if (mime !== 'application/pdf' && !name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Apenas arquivos PDF são aceitos' }, { status: 400 });
    }

    const admin = createAdminClient();
    const safeName = sanitizeFileName(file.name, 'pdf');
    const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${safeName}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(EDITAL_PDFS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      const message = uploadError.message.includes('Bucket not found')
        ? 'Crie o bucket "edital-pdfs" no Supabase Storage (privado).'
        : uploadError.message;
      return NextResponse.json({ error: message }, { status: 500 });
    }

    const edital = await insertEdital({
      title,
      description,
      pdfPath: storagePath,
      pdfFileName: safeName,
      createdBy: auth.user.id,
    });

    return NextResponse.json(edital);
  } catch (err) {
    console.error('[POST /api/editais]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao publicar edital' },
      { status: 500 }
    );
  }
}
