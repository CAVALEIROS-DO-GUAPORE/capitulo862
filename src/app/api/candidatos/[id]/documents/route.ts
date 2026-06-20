import { NextResponse, type NextRequest } from 'next/server';
import { canEditCandidates, getAuthenticatedUser } from '@/lib/candidatos-auth';
import { compressReceiptFile, sanitizeFileName } from '@/lib/compress-receipt';
import { isCandidateDocType } from '@/lib/candidate-documents';
import {
  getCandidates,
  getCandidateDocumentByType,
  upsertCandidateDocument,
  deleteCandidateDocument,
  CANDIDATE_DOCUMENTS_BUCKET,
} from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await canEditCandidates(request))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const user = await getAuthenticatedUser(request);
  const { id } = await params;

  const candidates = await getCandidates();
  if (!candidates.find((c) => c.id === id)) {
    return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
  }

  const formData = await request.formData();
  const docType = String(formData.get('docType') || '');
  const file = formData.get('file') as File | null;

  if (!isCandidateDocType(docType)) {
    return NextResponse.json({ error: 'Tipo de documento inválido' }, { status: 400 });
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
  }

  try {
    const existing = await getCandidateDocumentByType(id, docType);
    const rawBuffer = Buffer.from(await file.arrayBuffer());
    const compressed = await compressReceiptFile(rawBuffer, file.type, file.name);
    const safeName = sanitizeFileName(file.name, compressed.ext);
    const storagePath = `${id}/${docType}.${compressed.ext}`;

    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage
      .from(CANDIDATE_DOCUMENTS_BUCKET)
      .upload(storagePath, compressed.buffer, {
        contentType: compressed.contentType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(
        uploadError.message.includes('Bucket not found')
          ? 'Crie o bucket "candidate-documents" no Supabase Storage (privado).'
          : uploadError.message
      );
    }

    if (existing && existing.storagePath !== storagePath) {
      try {
        await admin.storage.from(CANDIDATE_DOCUMENTS_BUCKET).remove([existing.storagePath]);
      } catch {
        // ignora
      }
    }

    const doc = await upsertCandidateDocument({
      candidateId: id,
      docType,
      storagePath,
      fileName: safeName,
      mimeType: compressed.contentType,
      fileSize: compressed.buffer.length,
      uploadedBy: user?.id,
    });

    return NextResponse.json(doc);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao enviar documento' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await canEditCandidates(request))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const docType = searchParams.get('docType') || '';

  if (!isCandidateDocType(docType)) {
    return NextResponse.json({ error: 'Tipo de documento inválido' }, { status: 400 });
  }

  try {
    await deleteCandidateDocument(id, docType);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao remover documento' },
      { status: 500 }
    );
  }
}
