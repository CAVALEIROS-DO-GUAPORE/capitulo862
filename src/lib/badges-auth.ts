import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveProfileRole, getRequestUser } from '@/lib/panel-auth';

async function isConsultivoMember(userId: string): Promise<boolean> {
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

export async function canManageMemberBadges(request: NextRequest): Promise<boolean> {
  const user = await getRequestUser(request);
  if (!user) return false;

  const role = await getActiveProfileRole(user.id);
  if (role === 'admin') return true;
  return isConsultivoMember(user.id);
}
