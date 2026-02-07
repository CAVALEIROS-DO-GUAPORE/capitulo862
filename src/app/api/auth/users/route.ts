import { NextResponse, type NextRequest } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_ROLES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro'];

export async function GET(request: NextRequest) {
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
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  const { data: users, error } = await admin
    .from('profiles')
    .select('id, email, name, role, active, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(users || []);
}
