import { NextResponse, type NextRequest } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRollCalls, getRollCallByDate, upsertRollCall } from '@/lib/data';

const ROLES_CAN_LAUNCH_FREQUENCIA = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao'];

export async function GET(request: Request) {
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
    const supabase = createAuthenticatedClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !ROLES_CAN_LAUNCH_FREQUENCIA.includes(profile.role)) {
      return NextResponse.json({ error: 'Apenas escrivão, Mestre Conselheiro, 1º Conselheiro e admin podem lançar frequência.' }, { status: 403 });
    }

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
