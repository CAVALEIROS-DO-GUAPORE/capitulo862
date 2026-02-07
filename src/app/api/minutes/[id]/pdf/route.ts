import { NextResponse } from 'next/server';
import { getMinutes, getRollCalls, getMembers } from '@/lib/data';
import { buildAtaPdf } from '@/lib/pdf-ata';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [minutes, rollCalls, members] = await Promise.all([
      getMinutes(),
      getRollCalls(),
      getMembers(),
    ]);
    const minute = minutes.find((m) => m.id === id);
    if (!minute) {
      return NextResponse.json({ error: 'Ata não encontrada' }, { status: 404 });
    }
    if (minute.status !== 'publicada') {
      return NextResponse.json({ error: 'Apenas atas publicadas podem ser exportadas em PDF' }, { status: 400 });
    }
    const rollCall = minute.rollCallDate
      ? rollCalls.find((r) => r.date === minute.rollCallDate) ?? null
      : null;
    const pdfBytes = await buildAtaPdf(minute, rollCall, members);
    const filename = `ata-${minute.ataNumber ?? '0'}-${minute.ataYear ?? ''}.pdf`;
    const buffer = Buffer.from(pdfBytes);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 });
  }
}
