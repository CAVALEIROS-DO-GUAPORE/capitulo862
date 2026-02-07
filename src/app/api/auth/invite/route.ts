import { NextResponse, type NextRequest } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { MANAGER_ROLES, isPanelRole } from '@/lib/auth-constants';

const SENHA_PADRAO = 'capitulo862';

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
    if (!profile || !MANAGER_ROLES.includes(profile.role)) {
      return NextResponse.json({ error: 'Sem permissão para convidar usuários.' }, { status: 403 });
    }

    const body = await request.json();
    const { email, name, role: requestedRole } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const role = isPanelRole(requestedRole) ? requestedRole : 'membro';

    if (profile.role === 'mestre_conselheiro' && role === 'admin') {
      return NextResponse.json({ error: 'Apenas Admin pode definir o cargo Admin.' }, { status: 403 });
    }

    if (role === 'mestre_conselheiro') {
      await admin
        .from('profiles')
        .update({ role: 'membro', updated_at: new Date().toISOString() })
        .eq('role', 'mestre_conselheiro');
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: email.trim(),
      password: SENHA_PADRAO,
      email_confirm: true,
      user_metadata: { name: name || '', role },
    });

    if (error) {
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        return NextResponse.json({ error: 'Este email já está cadastrado.' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!data.user) {
      return NextResponse.json({ error: 'Erro ao criar usuário.' }, { status: 500 });
    }

    const { error: profileError } = await admin
      .from('profiles')
      .upsert(
        {
          id: data.user.id,
          email: data.user.email ?? email.trim(),
          name: name || '',
          role,
          active: true,
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
      return NextResponse.json(
        { error: 'Usuário criado, mas perfil falhou. Entre em contato com o suporte.' },
        { status: 500 }
      );
    }

    await admin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', data.user.id);

    return NextResponse.json({
      success: true,
      message: `Usuário criado. A senha padrão é "${SENHA_PADRAO}". O usuário pode trocá-la no perfil após o login.`,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao cadastrar usuário' },
      { status: 500 }
    );
  }
}
