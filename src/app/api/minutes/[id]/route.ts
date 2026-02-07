import { NextResponse } from 'next/server';
import { getMinutes, saveMinutes, getNextAtaNumber } from '@/lib/data';
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
    const index = minutes.findIndex((m) => m.id === id);
    if (index === -1) return NextResponse.json({ error: 'Ata não encontrada' }, { status: 404 });

    const m = minutes[index];
    const prevStatus = m.status || 'publicada';
    const newStatus = body.status ?? prevStatus;

    if (body.title !== undefined) m.title = String(body.title).trim();
    if (body.content !== undefined) m.content = String(body.content).trim();
    if (body.status !== undefined) m.status = body.status === 'publicada' ? 'publicada' : 'rascunho';
    if (body.date !== undefined) m.date = body.date;
    if (body.startTime !== undefined) m.startTime = body.startTime;
    if (body.endTime !== undefined) m.endTime = body.endTime;
    if (body.type !== undefined) m.type = body.type as AtaType;
    if (body.ourLodge !== undefined) m.ourLodge = Boolean(body.ourLodge);
    if (body.locationName !== undefined) m.locationName = body.locationName;
    if (body.city !== undefined) m.city = body.city;
    if (body.rollCallId !== undefined) m.rollCallId = body.rollCallId;
    if (body.rollCallDate !== undefined) m.rollCallDate = body.rollCallDate;
    if (body.presidingMc !== undefined) m.presidingMc = body.presidingMc;
    if (body.presiding1c !== undefined) m.presiding1c = body.presiding1c;
    if (body.presiding2c !== undefined) m.presiding2c = body.presiding2c;
    if (body.tiosPresentes !== undefined) m.tiosPresentes = Array.isArray(body.tiosPresentes) ? body.tiosPresentes : (m.tiosPresentes || []);
    if (body.trabalhosTexto !== undefined) m.trabalhosTexto = body.trabalhosTexto;
    if (body.escrivaoName !== undefined) m.escrivaoName = body.escrivaoName;

    if (newStatus === 'publicada' && prevStatus !== 'publicada') {
      const year = m.date ? new Date(m.date).getFullYear() : new Date().getFullYear();
      m.ataNumber = getNextAtaNumber(minutes, year);
      m.ataYear = year;
    }

    await saveMinutes(minutes);
    return NextResponse.json(minutes[index]);
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
    const filtered = minutes.filter((m) => m.id !== id);
    if (filtered.length === minutes.length) {
      return NextResponse.json({ error: 'Ata não encontrada' }, { status: 404 });
    }
    await saveMinutes(filtered);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
