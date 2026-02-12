import { NextResponse } from 'next/server';
import { getMinutes, updateMinute, deleteMinute, getNextAtaNumber } from '@/lib/data';
import type { InternalMinutes, AtaType } from '@/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const minutes = await getMinutes();
    const one = minutes.find((m) => m.id === id);
    if (!one) return NextResponse.json({ error: 'Ata não encontrada' }, { status: 404 });
    return NextResponse.json(one);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao carregar ata' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const minutes = await getMinutes();
    const m = minutes.find((x) => x.id === id);
    if (!m) return NextResponse.json({ error: 'Ata não encontrada' }, { status: 404 });

    const prevStatus = m.status || 'publicada';
    const newStatus = body.status ?? prevStatus;

    const partial: Partial<InternalMinutes> = {};
    if (body.title !== undefined) partial.title = String(body.title).trim();
    if (body.content !== undefined) partial.content = String(body.content).trim();
    if (body.status !== undefined) partial.status = body.status === 'publicada' ? 'publicada' : 'rascunho';
    if (body.date !== undefined) partial.date = body.date;
    if (body.startTime !== undefined) partial.startTime = body.startTime;
    if (body.endTime !== undefined) partial.endTime = body.endTime;
    if (body.type !== undefined) partial.type = body.type as AtaType;
    if (body.ourLodge !== undefined) partial.ourLodge = Boolean(body.ourLodge);
    if (body.locationName !== undefined) partial.locationName = body.locationName;
    if (body.city !== undefined) partial.city = body.city;
    if (body.rollCallId !== undefined) partial.rollCallId = body.rollCallId;
    if (body.rollCallDate !== undefined) partial.rollCallDate = body.rollCallDate;
    if (body.presidingMc !== undefined) partial.presidingMc = body.presidingMc;
    if (body.presiding1c !== undefined) partial.presiding1c = body.presiding1c;
    if (body.presiding2c !== undefined) partial.presiding2c = body.presiding2c;
    if (body.tiosPresentes !== undefined) partial.tiosPresentes = Array.isArray(body.tiosPresentes) ? body.tiosPresentes : (m.tiosPresentes || []);
    if (body.trabalhosTexto !== undefined) partial.trabalhosTexto = body.trabalhosTexto;
    if (body.escrivaoName !== undefined) partial.escrivaoName = body.escrivaoName;
    if (body.ataGestao !== undefined) partial.ataGestao = body.ataGestao;
    if (body.tioConselho !== undefined) partial.tioConselho = body.tioConselho;
    if (body.palavraSecreta !== undefined) partial.palavraSecreta = body.palavraSecreta;
    if (body.pauta !== undefined) partial.pauta = body.pauta;

    if (newStatus === 'publicada' && prevStatus !== 'publicada') {
      const year = m.date ? new Date(m.date).getFullYear() : new Date().getFullYear();
      partial.ataNumber = await getNextAtaNumber(year);
      partial.ataYear = year;
    }

    const updated = await updateMinute(id, partial);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const minutes = await getMinutes();
    if (!minutes.find((m) => m.id === id)) {
      return NextResponse.json({ error: 'Ata não encontrada' }, { status: 404 });
    }
    await deleteMinute(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
