import { NextResponse, type NextRequest } from 'next/server';
import { canViewCandidates } from '@/lib/candidatos-auth';
import { isCandidateDocType } from '@/lib/candidate-documents';
import { getCandidateDocumentByType, downloadCandidateDocumentFile } from '@/lib/data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docType: string }> }
) {
  if (!(await canViewCandidates(request))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id, docType } = await params;
  if (!isCandidateDocType(docType)) {
    return NextResponse.json({ error: 'Tipo de documento inválido' }, { status: 400 });
  }

  try {
    const doc = await getCandidateDocumentByType(id, docType);
    if (!doc) {
      return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 });
    }

    const { buffer, contentType } = await downloadCandidateDocumentFile(doc.storagePath);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType || doc.mimeType,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao baixar documento' },
      { status: 500 }
    );
  }
}
