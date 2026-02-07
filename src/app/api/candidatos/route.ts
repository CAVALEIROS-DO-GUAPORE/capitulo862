import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'candidatos.json');

async function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify([]), 'utf-8');
  }
}

async function getCandidates() {
  await ensureDataFile();
  const data = await fs.readFile(DATA_FILE, 'utf-8');
  return JSON.parse(data || '[]');
}

async function saveCandidates(candidates: unknown[]) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(candidates, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const candidates = await getCandidates();
    return NextResponse.json(candidates);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao carregar candidatos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      motherName,
      fatherName,
      birthDate,
      city,
      fatherIsMason,
      phone,
      email,
      knowsDemolay,
      demolayContactName,
      interestReason,
    } = body;

    if (!fullName || !motherName || !birthDate || !city || !phone || !email || !interestReason) {
      return NextResponse.json(
        { error: 'Preencha todos os campos obrigatórios' },
        { status: 400 }
      );
    }

    const candidates = await getCandidates();
    const newCandidate = {
      id: `cand-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      fullName: String(fullName).trim(),
      motherName: String(motherName).trim(),
      fatherName: fatherName ? String(fatherName).trim() : undefined,
      birthDate: String(birthDate),
      city: String(city).trim(),
      fatherIsMason: Boolean(fatherIsMason),
      phone: String(phone).trim(),
      email: String(email).trim(),
      knowsDemolay: Boolean(knowsDemolay),
      demolayContactName: knowsDemolay && demolayContactName ? String(demolayContactName).trim() : undefined,
      interestReason: String(interestReason).trim(),
      createdAt: new Date().toISOString(),
      readByMc: false,
      readByFirstCounselor: false,
    };

    candidates.push(newCandidate);
    await saveCandidates(candidates);

    return NextResponse.json({ success: true, id: newCandidate.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao salvar candidatura' }, { status: 500 });
  }
}
