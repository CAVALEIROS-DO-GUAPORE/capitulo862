import { NextResponse } from 'next/server';
import { getCandidates, insertCandidate } from '@/lib/data';

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

    const newCandidate = await insertCandidate({
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
    });

    return NextResponse.json({ success: true, id: newCandidate.id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao salvar candidatura' }, { status: 500 });
  }
}
