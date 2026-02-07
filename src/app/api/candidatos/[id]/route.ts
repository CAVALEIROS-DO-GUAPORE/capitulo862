import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'candidatos.json');

async function getCandidates() {
  try {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch {
    return [];
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const candidates = await getCandidates();
    const filtered = candidates.filter((c: { id: string }) => c.id !== id);
    if (filtered.length === candidates.length) {
      return NextResponse.json({ error: 'Candidato não encontrado' }, { status: 404 });
    }
    await fs.writeFile(DATA_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
