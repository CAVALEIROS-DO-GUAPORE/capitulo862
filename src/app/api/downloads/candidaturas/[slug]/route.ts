import { NextResponse, type NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { requirePanelUser } from '@/lib/panel-auth';
import { findCandidaturaDownload } from '@/lib/candidaturas-downloads';

function resolveCandidaturaFile(fileMatch: string): string | null {
  const dir = path.join(process.cwd(), 'public', 'candidaturas');
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir);
  const normalizedMatch = fileMatch.toUpperCase();
  const found = files.find((name) => name.toUpperCase().includes(normalizedMatch));
  return found ? path.join(dir, found) : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const auth = await requirePanelUser(request);
  if (!auth.ok) return auth.response;

  try {
    const { slug } = await params;
    const def = findCandidaturaDownload(slug);
    if (!def) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    }

    const filePath = resolveCandidaturaFile(def.fileMatch);
    if (!filePath) {
      return NextResponse.json({ error: 'PDF não encontrado em public/candidaturas' }, { status: 404 });
    }

    const buf = fs.readFileSync(filePath);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${def.downloadFilename}"`,
        'Content-Length': String(buf.length),
      },
    });
  } catch (err) {
    console.error('[GET /api/downloads/candidaturas/[slug]]', err);
    return NextResponse.json({ error: 'Erro ao baixar arquivo' }, { status: 500 });
  }
}
