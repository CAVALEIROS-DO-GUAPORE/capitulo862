import { NextResponse } from 'next/server';
import { getPublicRaffles } from '@/lib/data';

export async function GET() {
  try {
    const raffles = await getPublicRaffles();
    return NextResponse.json(raffles);
  } catch (err) {
    console.error('[GET /api/raffles/public]', err);
    return NextResponse.json({ error: 'Erro ao carregar sorteios' }, { status: 500 });
  }
}
