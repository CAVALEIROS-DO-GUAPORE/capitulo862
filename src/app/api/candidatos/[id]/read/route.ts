import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'candidatos.json');

async function getCandidates() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch {
    return [];
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { reader } = body;

    if (!reader || !['mc', 'first_counselor'].includes(reader)) {
      return NextResponse.json({ error: 'Leitor inválido' }, { status: 400 });
    }

    const candidates = await getCandidates();
    const index = candidates.findIndex((c: { id: string }) => c.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
    }

    if (reader === 'mc') {
      candidates[index].readByMc = true;
    } else {
      candidates[index].readByFirstCounselor = true;
    }

    await fs.writeFile(DATA_FILE, JSON.stringify(candidates, null, 2), 'utf-8');

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}
