import { NextResponse, type NextRequest } from 'next/server';
import { getRollCalls, getRollCallByDate, getRollCallById, upsertRollCall } from '@/lib/data';
import { requirePanelUser, requireRoles, ROLL_CALL_EDITOR_ROLES } from '@/lib/panel-auth';
import { canViewRollCalls } from '@/lib/panel-permissions';
import { gestaoFromDate } from '@/lib/gestao';
import type { MeetingType } from '@/types';

function parseMeetingType(value: string | null): MeetingType | undefined {
  if (value === 'ritualistica' || value === 'administrativa' || value === 'controle') return value;
  return undefined;
}

export async function GET(request: NextRequest) {
  const auth = await requirePanelUser(request);
  if (!auth.ok) return auth.response;
  if (!canViewRollCalls(auth.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const id = searchParams.get('id');
    const meetingType = parseMeetingType(searchParams.get('meetingType'));

    if (id) {
      const one = await getRollCallById(id);
      return NextResponse.json(one ?? null);
    }
    if (date) {
      const one = await getRollCallByDate(date);
      return NextResponse.json(one ?? null);
    }

    const rollCalls = await getRollCalls(meetingType);
    return NextResponse.json(rollCalls);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao carregar reuniões' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRoles(request, ROLL_CALL_EDITOR_ROLES);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const {
      id,
      date,
      attendance,
      gestao,
      tipoReuniao,
      breveDescricao,
      meetingType,
      title,
      description,
      startTime,
      endTime,
    } = body;

    if (!date || typeof date !== 'string') {
      return NextResponse.json({ error: 'Data é obrigatória' }, { status: 400 });
    }

    const parsedType = parseMeetingType(meetingType ?? null) || 'ritualistica';
    const payload = await upsertRollCall({
      id: id ? String(id) : undefined,
      date,
      attendance: typeof attendance === 'object' ? attendance : {},
      gestao: gestao != null ? String(gestao) : gestaoFromDate(date),
      tipoReuniao: tipoReuniao != null ? String(tipoReuniao) : undefined,
      breveDescricao: breveDescricao != null ? String(breveDescricao) : undefined,
      meetingType: parsedType,
      title: title != null ? String(title).trim() : undefined,
      description: description != null ? String(description).trim() : undefined,
      startTime: startTime != null ? String(startTime).trim() : undefined,
      endTime: endTime != null ? String(endTime).trim() : undefined,
      authorId: auth.user.id,
    });
    return NextResponse.json(payload);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao salvar reunião' }, { status: 500 });
  }
}
