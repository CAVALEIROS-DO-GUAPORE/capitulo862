import { NextResponse, type NextRequest } from 'next/server';
import { deleteRollCall, getRollCallById } from '@/lib/data';
import { requirePanelUser, requireRoles, ROLL_CALL_EDITOR_ROLES } from '@/lib/panel-auth';
import { canViewRollCalls } from '@/lib/panel-permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePanelUser(request);
  if (!auth.ok) return auth.response;
  if (!canViewRollCalls(auth.role)) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id } = await params;
  try {
    const meeting = await getRollCallById(id);
    if (!meeting) return NextResponse.json({ error: 'Reunião não encontrada' }, { status: 404 });
    return NextResponse.json(meeting);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao carregar reunião' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRoles(request, ROLL_CALL_EDITOR_ROLES);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    await deleteRollCall(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erro ao excluir reunião' }, { status: 500 });
  }
}
