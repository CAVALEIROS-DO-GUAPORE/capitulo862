import { NextResponse, type NextRequest } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const supabase = createAuthenticatedClient(request);
  if (!supabase) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json();
  const { newPassword } = body;

  if (!newPassword || typeof newPassword !== 'string') {
    return NextResponse.json({ error: 'Nova senha é obrigatória' }, { status: 400 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, { password: newPassword });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await admin
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', user.id);

  return NextResponse.json({ success: true });
}
