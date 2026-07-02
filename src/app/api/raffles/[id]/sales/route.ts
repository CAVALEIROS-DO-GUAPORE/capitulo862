import { NextResponse, type NextRequest } from 'next/server';
import {
  getRaffleById,
  getRaffleSales,
  insertRaffleSale,
  RAFFLE_RECEIPTS_BUCKET,
} from '@/lib/data';
import { requireRaffleAuditor, requireRaffleSeller } from '@/lib/raffles-auth';
import { formatBuyerName } from '@/lib/raffles-utils';
import { compressReceiptFile, sanitizeFileName } from '@/lib/compress-receipt';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  assertSaleRateLimit,
  isValidUuid,
  MAX_NUMBERS_PER_SALE,
  MAX_RECEIPT_BYTES,
  parseSaleNumbers,
  validateBuyerName,
  validatePhone,
} from '@/lib/raffles-security';

const ALLOWED_RECEIPT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auditor = await requireRaffleAuditor(request);
  if (!auditor.ok) {
    const seller = await requireRaffleSeller(request);
    if (!seller.ok) {
      return NextResponse.json(
        { error: seller.status === 401 ? 'Não autorizado' : 'Sem permissão' },
        { status: seller.status }
      );
    }
  }

  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const raffle = await getRaffleById(id);
  if (!raffle) return NextResponse.json({ error: 'Sorteio não encontrado' }, { status: 404 });

  try {
    const sales = await getRaffleSales(id);
    if (auditor.ok) {
      return NextResponse.json(
        sales.map(({ receiptPath, ...rest }) => ({
          ...rest,
          hasReceipt: !!receiptPath,
        }))
      );
    }
    return NextResponse.json(
      sales.map(({ receiptPath, buyerPhone, buyerPhoneExtra, ...rest }) => ({
        ...rest,
        hasReceipt: !!receiptPath,
        buyerPhone: buyerPhone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) *****-$3'),
        buyerPhoneExtra: buyerPhoneExtra
          ? buyerPhoneExtra.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) *****-$3')
          : undefined,
        receiptFileName: undefined,
      }))
    );
  } catch (err) {
    console.error('[GET /api/raffles/[id]/sales]', err);
    return NextResponse.json({ error: 'Erro ao carregar vendas' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const seller = await requireRaffleSeller(request);
  if (!seller.ok) {
    return NextResponse.json(
      { error: seller.status === 401 ? 'Não autorizado' : 'Sem permissão para vender' },
      { status: seller.status }
    );
  }

  const { id: raffleId } = await params;
  if (!isValidUuid(raffleId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const raffle = await getRaffleById(raffleId);
  if (!raffle) return NextResponse.json({ error: 'Sorteio não encontrado' }, { status: 404 });
  if (raffle.status !== 'active') {
    return NextResponse.json({ error: 'Este sorteio não está ativo para vendas' }, { status: 400 });
  }

  let storagePath: string | undefined;

  try {
    assertSaleRateLimit(seller.user.id, raffleId);

    const formData = await request.formData();
    const buyerNameRaw = formData.get('buyerName');
    const buyerPhoneRaw = formData.get('buyerPhone');
    const buyerPhoneExtraRaw = formData.get('buyerPhoneExtra');
    const numbersRaw = formData.get('numbers');
    const receipt = formData.get('receipt');

    if (typeof buyerNameRaw !== 'string') {
      return NextResponse.json({ error: 'Nome do comprador é obrigatório' }, { status: 400 });
    }
    if (typeof buyerPhoneRaw !== 'string') {
      return NextResponse.json({ error: 'Telefone do comprador é obrigatório' }, { status: 400 });
    }
    if (!(receipt instanceof File) || receipt.size === 0) {
      return NextResponse.json({ error: 'Comprovante de pagamento é obrigatório' }, { status: 400 });
    }
    if (receipt.size > MAX_RECEIPT_BYTES) {
      return NextResponse.json({ error: 'Comprovante deve ter no máximo 5MB' }, { status: 400 });
    }
    if (!ALLOWED_RECEIPT_TYPES.has(receipt.type.toLowerCase())) {
      return NextResponse.json({ error: 'Comprovante deve ser imagem ou PDF' }, { status: 400 });
    }

    const numbers = parseSaleNumbers(numbersRaw, {
      maxPerSale: MAX_NUMBERS_PER_SALE,
      totalNumbers: raffle.totalNumbers,
    });

    const buyerName = validateBuyerName(buyerNameRaw);
    const buyerPhone = validatePhone(buyerPhoneRaw);
    const buyerPhoneExtra =
      typeof buyerPhoneExtraRaw === 'string' && buyerPhoneExtraRaw.trim()
        ? validatePhone(buyerPhoneExtraRaw, 'Telefone extra')
        : undefined;

    const admin = createAdminClient();
    const rawBuffer = Buffer.from(await receipt.arrayBuffer());
    const compressed = await compressReceiptFile(rawBuffer, receipt.type, receipt.name);
    const safeName = sanitizeFileName(receipt.name, compressed.ext);
    storagePath = `${raffleId}/${seller.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${compressed.ext}`;

    const { error: uploadError } = await admin.storage
      .from(RAFFLE_RECEIPTS_BUCKET)
      .upload(storagePath, compressed.buffer, {
        contentType: compressed.contentType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        uploadError.message.includes('Bucket not found')
          ? 'Crie o bucket "raffle-receipts" no Supabase Storage (privado).'
          : uploadError.message
      );
    }

    const sale = await insertRaffleSale({
      raffleId,
      buyerName: formatBuyerName(buyerName),
      buyerPhone,
      buyerPhoneExtra,
      numbers,
      sellerUserId: seller.user.id,
      receiptPath: storagePath,
      receiptFileName: safeName,
    });

    return NextResponse.json({
      id: sale.id,
      raffleId: sale.raffleId,
      buyerName: sale.buyerName,
      numbers: sale.numbers,
      createdAt: sale.createdAt,
    });
  } catch (err) {
    if (storagePath) {
      try {
        const admin = createAdminClient();
        await admin.storage.from(RAFFLE_RECEIPTS_BUCKET).remove([storagePath]);
      } catch {
        /* ignore cleanup failure */
      }
    }
    console.error('[POST /api/raffles/[id]/sales]', err);
    const message = err instanceof Error ? err.message : 'Erro ao registrar venda';
    const status =
      message.includes('Máximo') ||
      message.includes('inválid') ||
      message.includes('Limite') ||
      message.includes('vendido') ||
      message.includes('Selecione')
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
