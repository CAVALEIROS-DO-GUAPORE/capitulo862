import { NextResponse, type NextRequest } from 'next/server';
import { getRollCalls, getRollCallByDate, upsertRollCall } from '@/lib/data';
import { requirePanelUser, requireRoles, ROLL_CALL_EDITOR_ROLES } from '@/lib/panel-auth';

export async function GET(request: NextRequest) {
  const auth = await requirePanelUser(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    if (date) {
      const one = await getRollCallByDate(date);
      return NextResponse.json(one ?? null);
    }
    const rollCalls = await getRollCalls();
    return NextResponse.json(rollCalls);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao carregar chamadas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ROLL_CALL_EDITOR_ROLES);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { date, attendance, gestao, tipoReuniao, breveDescricao } = body;
    if (!date || typeof date !== 'string') {
      return NextResponse.json({ error: 'Data é obrigatória' }, { status: 400 });
    }
    const payload = await upsertRollCall({
      date,
      attendance: typeof attendance === 'object' ? attendance : {},
      gestao: gestao != null ? String(gestao) : undefined,
      tipoReuniao: tipoReuniao != null ? String(tipoReuniao) : undefined,
      breveDescricao: breveDescricao != null ? String(breveDescricao) : undefined,
    });
    return NextResponse.json(payload);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao salvar chamada' }, { status: 500 });
  }
}
