import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Resolve login (e-mail ou ID do membro) para o e-mail da conta.
 * ID 0 ou inválido não resolve — o usuário deve usar o e-mail.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const login = typeof body.login === 'string' ? body.login.trim() : '';
    if (!login) {
      return NextResponse.json({ error: 'Informe e-mail ou ID' }, { status: 400 });
    }

    if (login.includes('@')) {
      return NextResponse.json({ email: login.toLowerCase() });
    }

    const identifier = Number(login);
    if (!Number.isInteger(identifier) || identifier <= 0) {
      return NextResponse.json(
        { error: 'ID inválido. Use um ID maior que zero ou o e-mail da conta.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { data: member, error: memberError } = await admin
      .from('members')
      .select('id, name, user_id')
      .eq('identifier', identifier)
      .limit(1)
      .maybeSingle();

    if (memberError) {
      console.error('[POST /api/auth/resolve-login]', memberError);
      return NextResponse.json({ error: 'Erro ao buscar ID' }, { status: 500 });
    }

    if (!member) {
      return NextResponse.json(
        { error: 'ID não encontrado. Use o e-mail para entrar.' },
        { status: 404 }
      );
    }

    let userId = member.user_id ? String(member.user_id) : null;

    // Se o membro ainda não está vinculado à conta, tenta pelo nome do perfil
    if (!userId && member.name) {
      const { data: byName } = await admin
        .from('profiles')
        .select('id, email, active')
        .ilike('name', String(member.name).trim())
        .limit(1)
        .maybeSingle();

      if (byName?.id && byName.email) {
        userId = String(byName.id);
        try {
          await admin.from('members').update({ user_id: userId }).eq('id', member.id);
        } catch {
          /* vínculo opcional */
        }

        if (byName.active === false) {
          return NextResponse.json(
            { error: 'Esta conta está inativa. Entre em contato com o Capítulo.' },
            { status: 403 }
          );
        }

        return NextResponse.json({ email: String(byName.email).toLowerCase() });
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'ID sem conta vinculada. Use o e-mail para entrar.' },
        { status: 404 }
      );
    }

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('email, active')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile?.email) {
      return NextResponse.json(
        { error: 'Conta vinculada ao ID não encontrada. Use o e-mail para entrar.' },
        { status: 404 }
      );
    }

    if (profile.active === false) {
      return NextResponse.json(
        { error: 'Esta conta está inativa. Entre em contato com o Capítulo.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ email: String(profile.email).toLowerCase() });
  } catch (err) {
    console.error('[POST /api/auth/resolve-login]', err);
    return NextResponse.json({ error: 'Erro ao processar login' }, { status: 500 });
  }
}
