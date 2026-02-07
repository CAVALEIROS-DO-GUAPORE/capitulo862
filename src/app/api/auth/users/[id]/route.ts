import { NextResponse, type NextRequest } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_ROLES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro'];

async function checkPermission(request: NextRequest) {
  const supabase = createAuthenticatedClient(request);
  if (!supabase) return { authorized: false, admin: null as ReturnType<typeof createAdminClient> | null };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { authorized: false, admin: null };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    return { authorized: false, admin: null };
  }

  return { authorized: true, admin };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, admin } = await checkPermission(request);
  if (!authorized || !admin) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { active } = body;

  if (typeof active !== 'boolean') {
    return NextResponse.json({ error: 'Campo active é obrigatório (true/false)' }, { status: 400 });
  }

  const { error } = await admin
    .from('profiles')
    .update({ active, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, active });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { authorized, admin } = await checkPermission(request);
  if (!authorized || !admin) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { id } = await params;

  const supabase = createAuthenticatedClient(request);
  if (!supabase) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (currentUser?.id === id) {
    return NextResponse.json({ error: 'Você não pode excluir sua própria conta.' }, { status: 400 });
  }

  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(id);

  if (deleteAuthError) {
    return NextResponse.json({ error: deleteAuthError.message }, { status: 500 });
  }

  await admin.from('profiles').delete().eq('id', id);

  return NextResponse.json({ success: true });
}
