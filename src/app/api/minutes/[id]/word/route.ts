import { NextResponse, type NextRequest } from 'next/server';
import { getMinutes, getMembers, getRollCallByDate } from '@/lib/data';
import { buildFilledAtaDocxBuffer } from '@/lib/build-ata-docx-buffer';
import { requireRoles, MINUTES_EDITOR_ROLES } from '@/lib/panel-auth';

/** Preenche o modelo atareuniao.docx com as tags e devolve o Word para download. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(request, MINUTES_EDITOR_ROLES);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const [minutes, members] = await Promise.all([getMinutes(), getMembers()]);
    const minute = minutes.find((m) => m.id === id);
    if (!minute) {
      return NextResponse.json({ error: 'Ata não encontrada' }, { status: 404 });
    }
    if (minute.status !== 'publicada') {
      return NextResponse.json(
        { error: 'Apenas atas publicadas podem ser exportadas em Word' },
        { status: 400 }
      );
    }

    const rollCall = minute.rollCallDate ? await getRollCallByDate(minute.rollCallDate) : null;
    const buf = buildFilledAtaDocxBuffer(minute, rollCall, members);

    const filename = `ata-${minute.ataNumber ?? '0'}-${minute.ataYear ?? ''}.docx`;
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buf.length),
      },
    });
  } catch (err) {
    console.error('[GET /api/minutes/[id]/word]', err);
    return NextResponse.json({ error: 'Erro ao gerar Word' }, { status: 500 });
  }
}
