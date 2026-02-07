import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, name, role } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email.trim(), {
      data: {
        name: name || '',
        role: role || 'membro',
      },
      redirectTo: `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login`,
    });

    if (error) {
      if (error.message.includes('already been registered')) {
        return NextResponse.json({ error: 'Este email já está cadastrado.' }, { status: 400 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Convite enviado. O usuário receberá um link por email para criar a senha.' });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao enviar convite' },
      { status: 500 }
    );
  }
}
