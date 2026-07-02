import { NextResponse, type NextRequest } from 'next/server';
import { getRaffles, insertRaffle } from '@/lib/data';
import { requirePanelUser } from '@/lib/panel-auth';
import { canManageRaffles } from '@/lib/raffles-auth';
import { validateCreateRaffleInput } from '@/lib/raffles-security';
import type { RaffleStatus } from '@/types';

const ALLOWED_STATUS = new Set<RaffleStatus>(['active', 'closed', 'drawn']);

export async function GET(request: NextRequest) {
  const auth = await requirePanelUser(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get('status');
    const status =
      statusParam && ALLOWED_STATUS.has(statusParam as RaffleStatus)
        ? (statusParam as RaffleStatus)
        : undefined;
    const raffles = await getRaffles(status ? { status } : undefined);
    return NextResponse.json(raffles);
  } catch (err) {
    console.error('[GET /api/raffles]', err);
    return NextResponse.json({ error: 'Erro ao carregar sorteios' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await canManageRaffles(request))) {
    return NextResponse.json({ error: 'Sem permissão para cadastrar sorteios' }, { status: 403 });
  }

  const auth = await requirePanelUser(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const input = validateCreateRaffleInput(body);

    const raffle = await insertRaffle({
      ...input,
      createdBy: auth.user.id,
    });

    return NextResponse.json(raffle);
  } catch (err) {
    console.error('[POST /api/raffles]', err);
    const message = err instanceof Error ? err.message : 'Erro ao criar sorteio';
    const status = message.includes('inválid') || message.includes('máximo') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
