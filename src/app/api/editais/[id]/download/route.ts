import { NextResponse, type NextRequest } from 'next/server';
import { downloadEditalPdf, getEditalById } from '@/lib/data';
import { requirePanelUser } from '@/lib/panel-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePanelUser(request);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const edital = await getEditalById(id);
    if (!edital) {
      return NextResponse.json({ error: 'Edital não encontrado' }, { status: 404 });
    }

    const { buffer } = await downloadEditalPdf(edital.pdfPath);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(edital.pdfFileName)}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    console.error('[GET /api/editais/[id]/download]', err);
    return NextResponse.json({ error: 'Erro ao baixar edital' }, { status: 500 });
  }
}
