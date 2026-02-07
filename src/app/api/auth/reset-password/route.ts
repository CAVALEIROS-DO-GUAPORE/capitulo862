import { NextResponse, type NextRequest } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_ROLES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro'];

export async function POST(request: NextRequest) {
  const supabase = createAuthenticatedClient(request);
  if (!supabase) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    return NextResponse.json({ error: 'Sem permissão para redefinir senhas. Apenas MC, 1º Conselheiro e Admin.' }, { status: 403 });
  }

  const body = await request.json();
  const { email, newPassword } = body;

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
  }
  if (!newPassword || typeof newPassword !== 'string') {
    return NextResponse.json({ error: 'Nova senha é obrigatória' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
  }

  const { data: targetProfile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email.trim())
    .limit(1)
    .maybeSingle();

  if (!targetProfile) {
    return NextResponse.json({ error: 'Usuário não encontrado com este email.' }, { status: 404 });
  }

  const { error } = await admin.auth.admin.updateUserById(targetProfile.id, { password: newPassword });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: 'Senha alterada com sucesso.' });
}
