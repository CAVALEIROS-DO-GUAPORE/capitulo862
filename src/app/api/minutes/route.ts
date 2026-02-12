import { NextResponse } from 'next/server';
import { getMinutes, insertMinute, getNextAtaNumber } from '@/lib/data';
import type { InternalMinutes, AtaType } from '@/types';

export async function GET() {
  try {
    const minutes = await getMinutes();
    return NextResponse.json(minutes);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao carregar atas' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      title,
      content,
      status = 'rascunho',
      date,
      startTime = '',
      endTime = '',
      type = 'ADMINISTRATIVA',
      ourLodge = true,
      locationName,
      city,
      rollCallId,
      rollCallDate,
      presidingMc,
      presiding1c,
      presiding2c,
      tiosPresentes = [],
      trabalhosTexto = '',
      escrivaoName,
      ataGestao,
      tioConselho,
      palavraSecreta,
      pauta,
    } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Título e conteúdo são obrigatórios' }, { status: 400 });
    }

    const ataDate = date ? new Date(date) : new Date();
    const year = ataDate.getFullYear();
    const ataNumber = status === 'publicada' ? await getNextAtaNumber(year) : undefined;
    const ataYear = status === 'publicada' ? year : undefined;

    const newItem = await insertMinute({
      title: String(title).trim(),
      content: String(content).trim(),
      createdAt: new Date().toISOString(),
      authorId: 'system',
      status: status === 'publicada' ? 'publicada' : 'rascunho',
      ataNumber,
      ataYear,
      date: date || ataDate.toISOString().slice(0, 10),
      startTime: String(startTime || ''),
      endTime: String(endTime || ''),
      type: (type as AtaType) || 'ADMINISTRATIVA',
      ourLodge: Boolean(ourLodge),
      locationName: locationName ? String(locationName) : undefined,
      city: city ? String(city) : undefined,
      rollCallId: rollCallId || undefined,
      rollCallDate: rollCallDate ? String(rollCallDate) : undefined,
      presidingMc: presidingMc ? String(presidingMc) : undefined,
      presiding1c: presiding1c ? String(presiding1c) : undefined,
      presiding2c: presiding2c ? String(presiding2c) : undefined,
      tiosPresentes: Array.isArray(tiosPresentes) ? tiosPresentes : [],
      trabalhosTexto: String(trabalhosTexto || ''),
      escrivaoName: escrivaoName ? String(escrivaoName) : undefined,
      ataGestao: ataGestao ? String(ataGestao) : undefined,
      tioConselho: tioConselho ? String(tioConselho) : undefined,
      palavraSecreta: palavraSecreta ? String(palavraSecreta) : undefined,
      pauta: pauta ? String(pauta) : undefined,
    });

    return NextResponse.json(newItem);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[POST /api/minutes]', err);
    if (message.includes('Missing Supabase') || message.includes('credentials')) {
      return NextResponse.json(
        { error: 'Serviço indisponível. Verifique as variáveis de ambiente do Supabase (Vercel).' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'Erro ao salvar ata' }, { status: 500 });
  }
}
