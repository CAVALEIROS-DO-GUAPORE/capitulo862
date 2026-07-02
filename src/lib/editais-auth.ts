import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveProfileRole, getRequestUser } from '@/lib/panel-auth';

async function isConsultorMember(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from('members')
    .select('category, additional_roles')
    .eq('user_id', userId);

  for (const m of members || []) {
    if (m.category === 'consultores') return true;
    const extras = m.additional_roles as { category?: string }[] | null;
    if (Array.isArray(extras) && extras.some((r) => r.category === 'consultores')) {
      return true;
    }
  }
  return false;
}

/** Mestre Conselheiro, admin e consultores do capítulo podem publicar editais. */
export async function canManageEditais(request: NextRequest): Promise<boolean> {
  const user = await getRequestUser(request);
  if (!user) return false;

  const role = await getActiveProfileRole(user.id);
  if (role === 'admin' || role === 'mestre_conselheiro') return true;
  return isConsultorMember(user.id);
}

export async function requireEditalManager(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return { ok: false as const, status: 401 as const };
  const allowed = await canManageEditais(request);
  if (!allowed) return { ok: false as const, status: 403 as const };
  const role = await getActiveProfileRole(user.id);
  return { ok: true as const, user, role: role! };
}
