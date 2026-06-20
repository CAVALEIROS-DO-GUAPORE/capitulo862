import { NextResponse, type NextRequest } from 'next/server';
import PizZip from 'pizzip';
import { isAuthenticatedPanelUser } from '@/lib/finance-auth';
import {
  getFinanceEntries,
  getFinanceReceipts,
  downloadFinanceReceiptFile,
} from '@/lib/data';

function uniqueZipName(name: string, used: Map<string, number>): string {
  const count = used.get(name) ?? 0;
  used.set(name, count + 1);
  if (count === 0) return name;
  const dot = name.lastIndexOf('.');
  if (dot === -1) return `${name}-${count + 1}`;
  return `${name.slice(0, dot)}-${count + 1}${name.slice(dot)}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticatedPanelUser(request))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const entries = await getFinanceEntries();
  const entry = entries.find((e) => e.id === id);
  if (!entry) {
    return NextResponse.json({ error: 'Movimentação não encontrada' }, { status: 404 });
  }

  try {
    const receipts = await getFinanceReceipts(id);
    if (receipts.length === 0) {
      return NextResponse.json({ error: 'Nenhum comprovante' }, { status: 404 });
    }

    const dateLabel = entry.date.replace(/-/g, '');

    if (receipts.length === 1) {
      const receipt = receipts[0];
      const { buffer } = await downloadFinanceReceiptFile(receipt.storagePath);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': receipt.mimeType,
          'Content-Disposition': `attachment; filename="${encodeURIComponent(receipt.fileName)}"`,
        },
      });
    }

    const zip = new PizZip();
    const usedNames = new Map<string, number>();

    for (const receipt of receipts) {
      const { buffer } = await downloadFinanceReceiptFile(receipt.storagePath);
      zip.file(uniqueZipName(receipt.fileName, usedNames), buffer);
    }

    const zipBuffer = zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    const zipName = `comprovantes-${dateLabel}.zip`;

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(zipName)}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao baixar comprovantes' },
      { status: 500 }
    );
  }
}
