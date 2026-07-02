import { NextResponse, type NextRequest } from 'next/server';
import ExcelJS from 'exceljs';
import { getRaffleById, getRaffleSoldReportRows } from '@/lib/data';
import { requireRaffleAuditor } from '@/lib/raffles-auth';
import { isValidUuid } from '@/lib/raffles-security';
import { formatDrawDate } from '@/lib/raffles-utils';

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
}

function safeFileName(title: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'sorteio';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auditor = await requireRaffleAuditor(request);
  if (!auditor.ok) {
    return NextResponse.json(
      { error: auditor.status === 401 ? 'Não autorizado' : 'Sem permissão' },
      { status: auditor.status }
    );
  }

  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const raffle = await getRaffleById(id);
  if (!raffle) {
    return NextResponse.json({ error: 'Sorteio não encontrado' }, { status: 404 });
  }

  try {
    const rows = await getRaffleSoldReportRows(id);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Capítulo 862';
    const sheet = workbook.addWorksheet('Números vendidos');

    sheet.addRow([`Sorteio: ${raffle.title}`]);
    sheet.mergeCells(1, 1, 1, 5);
    sheet.getRow(1).font = { bold: true, size: 12 };

    sheet.addRow([`Sorteio em: ${formatDrawDate(raffle.drawAt)}`]);
    sheet.mergeCells(2, 1, 2, 5);

    sheet.addRow(['Número', 'Comprador', 'Telefone', 'Telefone extra', 'Data da venda']);
    const headerRow = sheet.getRow(3);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle' };

    sheet.getColumn(1).width = 10;
    sheet.getColumn(2).width = 36;
    sheet.getColumn(3).width = 18;
    sheet.getColumn(4).width = 18;
    sheet.getColumn(5).width = 22;

    for (const row of rows) {
      sheet.addRow([
        row.number,
        row.buyerName,
        formatPhoneDisplay(row.buyerPhone),
        row.buyerPhoneExtra ? formatPhoneDisplay(row.buyerPhoneExtra) : '',
        row.soldAt ? formatDrawDate(row.soldAt) : '',
      ]);
    }

    const out = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
    const body = new Uint8Array(buffer);
    const filename = `relatorio-${safeFileName(raffle.title)}.xlsx`;

    return new NextResponse(body, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': String(body.length),
      },
    });
  } catch (err) {
    console.error('[GET /api/raffles/[id]/report]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao gerar relatório' },
      { status: 500 }
    );
  }
}
