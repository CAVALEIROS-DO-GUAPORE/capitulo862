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

const ALLOWED_ROLE_VALUES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'segundo_conselheiro', 'escrivao', 'hospitaleiro', 'tesoureiro', 'membro', 'presidente_seniores', 'vice_presidente_seniores', 'senior', 'presidente_consultivo', 'membro_organizador', 'consultor', 'mestre_escudeiro', 'primeiro_escudeiro', 'segundo_escudeiro', 'escudeiro'];

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
  const { active, role, name } = body;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof active === 'boolean') updates.active = active;
  if (typeof role === 'string' && ALLOWED_ROLE_VALUES.includes(role)) updates.role = role;
  if (typeof name === 'string') updates.name = name.trim();

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar (active, role ou name)' }, { status: 400 });
  }

  const { error } = await admin
    .from('profiles')
    .update(updates)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, ...updates });
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

  // 1) Remover referências ao usuário em outras tabelas (evita erro de FK ao deletar em auth)
  await admin.from('members').update({ user_id: null }).eq('user_id', id);
  await admin.from('roll_calls').update({ author_id: null }).eq('author_id', id);

  // 2) Deletar perfil antes de deletar o usuário no Auth (evita "Database error deleting user")
  const { error: profileError } = await admin.from('profiles').delete().eq('id', id);
  if (profileError) {
    return NextResponse.json({ error: `Erro ao remover perfil: ${profileError.message}` }, { status: 500 });
  }

  // 3) Deletar usuário no Auth
  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(id);
  if (deleteAuthError) {
    return NextResponse.json({ error: deleteAuthError.message || 'Erro ao excluir usuário no sistema de autenticação.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
