import { NextResponse, type NextRequest } from 'next/server';
import {
  getRaffleById,
  getRaffleSoldNumbers,
  updateRaffle,
  deleteRaffle,
} from '@/lib/data';
import { requirePanelUser } from '@/lib/panel-auth';
import { canManageRaffles } from '@/lib/raffles-auth';
import {
  isValidUuid,
  validateBannerUrl,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_PRIZE_LENGTH,
  MAX_PRIZES,
  MAX_TOTAL_NUMBERS,
} from '@/lib/raffles-security';
import type { RaffleStatus } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePanelUser(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
    const raffle = await getRaffleById(id);
    if (!raffle) return NextResponse.json({ error: 'Sorteio não encontrado' }, { status: 404 });
    const soldNumbers = await getRaffleSoldNumbers(id);
    return NextResponse.json({ ...raffle, soldNumbers });
  } catch (err) {
    console.error('[GET /api/raffles/[id]]', err);
    return NextResponse.json({ error: 'Erro ao carregar sorteio' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await canManageRaffles(request))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  const existing = await getRaffleById(id);
  if (!existing) return NextResponse.json({ error: 'Sorteio não encontrado' }, { status: 404 });

  try {
    const body = await request.json();
    const partial: Parameters<typeof updateRaffle>[1] = {};

    if (body.title != null) {
      const title = String(body.title).trim();
      if (!title || title.length > MAX_TITLE_LENGTH) {
        return NextResponse.json({ error: 'Título inválido' }, { status: 400 });
      }
      partial.title = title;
    }
    if (body.description != null) {
      partial.description = String(body.description).trim().slice(0, MAX_DESCRIPTION_LENGTH);
    }
    if (body.pricePerNumber != null) {
      const price = Number(body.pricePerNumber);
      if (!Number.isFinite(price) || price <= 0 || price > 1_000_000) {
        return NextResponse.json({ error: 'Valor inválido' }, { status: 400 });
      }
      partial.pricePerNumber = price;
    }
    if (body.prizes != null && Array.isArray(body.prizes)) {
      const prizes = body.prizes
        .map((p: unknown) => String(p).trim())
        .filter(Boolean)
        .slice(0, MAX_PRIZES);
      if (prizes.some((p: string) => p.length > MAX_PRIZE_LENGTH)) {
        return NextResponse.json({ error: 'Prêmio muito longo' }, { status: 400 });
      }
      if (prizes.length === 0) {
        return NextResponse.json({ error: 'Informe ao menos um prêmio' }, { status: 400 });
      }
      partial.prizes = prizes;
    }
    if (body.drawAt != null) {
      const drawAt = String(body.drawAt);
      if (Number.isNaN(Date.parse(drawAt))) {
        return NextResponse.json({ error: 'Data do sorteio inválida' }, { status: 400 });
      }
      partial.drawAt = drawAt;
    }
    if (body.whatsappContact != null) {
      partial.whatsappContact = String(body.whatsappContact).trim();
    }
    if (body.pixKey != null) {
      const pixKey = String(body.pixKey).trim();
      if (!pixKey || pixKey.length > 120) {
        return NextResponse.json({ error: 'Chave PIX inválida' }, { status: 400 });
      }
      partial.pixKey = pixKey;
    }
    if (body.totalNumbers != null) {
      const total = Number(body.totalNumbers);
      if (!Number.isInteger(total) || total < 1 || total > MAX_TOTAL_NUMBERS) {
        return NextResponse.json({ error: 'Quantidade de números inválida' }, { status: 400 });
      }
      partial.totalNumbers = total;
    }
    if (body.bannerUrl != null) {
      partial.bannerUrl = validateBannerUrl(String(body.bannerUrl));
    }
    if (body.status === 'active' || body.status === 'closed' || body.status === 'drawn') {
      partial.status = body.status as RaffleStatus;
    }

    const raffle = await updateRaffle(id, partial);
    return NextResponse.json(raffle);
  } catch (err) {
    console.error('[PATCH /api/raffles/[id]]', err);
    const message = err instanceof Error ? err.message : 'Erro ao atualizar sorteio';
    const status = message.includes('Não é possível') || message.includes('inválid') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await canManageRaffles(request))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id } = await params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
  }

  try {
    await deleteRaffle(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/raffles/[id]]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao excluir sorteio' },
      { status: 500 }
    );
  }
}
