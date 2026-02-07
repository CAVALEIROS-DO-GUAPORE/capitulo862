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
