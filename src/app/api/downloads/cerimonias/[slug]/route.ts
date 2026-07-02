import { NextResponse, type NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { requirePanelUser } from '@/lib/panel-auth';
import { findCerimoniaDownload } from '@/lib/cerimonias-downloads';

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveCerimoniaFile(slug: string): string | null {
  const dir = path.join(process.cwd(), 'public', 'cerimonias');
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir).filter((n) => n.toLowerCase().endsWith('.pdf'));
  const found = files.find((name) => slugify(path.parse(name).name) === slug);
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
    const def = findCerimoniaDownload(slug);
    if (!def) {
      return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
    }

    const filePath = resolveCerimoniaFile(def.slug);
    if (!filePath) {
      return NextResponse.json({ error: 'PDF não encontrado em public/cerimonias' }, { status: 404 });
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
    console.error('[GET /api/downloads/cerimonias/[slug]]', err);
    return NextResponse.json({ error: 'Erro ao baixar arquivo' }, { status: 500 });
  }
}

