import { NextResponse, type NextRequest } from 'next/server';
import { canManageFinance, isAuthenticatedPanelUser } from '@/lib/finance-auth';
import { compressReceiptFile, sanitizeFileName } from '@/lib/compress-receipt';
import {
  getFinanceEntries,
  getFinanceReceipts,
  insertFinanceReceipt,
  FINANCE_RECEIPTS_BUCKET,
} from '@/lib/data';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthenticatedPanelUser(request))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id } = await params;
  const entries = await getFinanceEntries();
  if (!entries.find((e) => e.id === id)) {
    return NextResponse.json({ error: 'Movimentação não encontrada' }, { status: 404 });
  }

  try {
    const receipts = await getFinanceReceipts(id);
    return NextResponse.json(
      receipts.map(({ storagePath, ...rest }) => rest)
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao carregar comprovantes' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await canManageFinance(request))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id } = await params;
  const entries = await getFinanceEntries();
  if (!entries.find((e) => e.id === id)) {
    return NextResponse.json({ error: 'Movimentação não encontrada' }, { status: 404 });
  }

  const formData = await request.formData();
  const files = formData.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
  }

  const admin = createAdminClient();
  const uploaded = [];

  try {
    for (const file of files) {
      const rawBuffer = Buffer.from(await file.arrayBuffer());
      const compressed = await compressReceiptFile(rawBuffer, file.type, file.name);
      const safeName = sanitizeFileName(file.name, compressed.ext);
      const storagePath = `${id}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${compressed.ext}`;

      const { error: uploadError } = await admin.storage
        .from(FINANCE_RECEIPTS_BUCKET)
        .upload(storagePath, compressed.buffer, {
          contentType: compressed.contentType,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          uploadError.message.includes('Bucket not found')
            ? 'Crie o bucket "finance-receipts" no Supabase Storage (privado).'
            : uploadError.message
        );
      }

      const receipt = await insertFinanceReceipt({
        financeEntryId: id,
        storagePath,
        fileName: safeName,
        mimeType: compressed.contentType,
        fileSize: compressed.buffer.length,
      });
      uploaded.push(receipt);
    }

    return NextResponse.json(uploaded);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao enviar comprovante' },
      { status: 500 }
    );
  }
}
