import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const SENHA_PADRAO = 'capitulo862';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, role } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase.auth.admin.createUser({
      email: email.trim(),
      password: SENHA_PADRAO,
      email_confirm: true,
      user_metadata: {
        name: name || '',
        role: role || 'membro',
      },
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

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: data.user.id,
          email: data.user.email ?? email.trim(),
          name: name || '',
          role: role || 'membro',
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

    await supabase
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
