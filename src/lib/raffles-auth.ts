import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PANEL_ROLES } from '@/lib/auth-constants';
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

export async function canManageRaffles(request: NextRequest): Promise<boolean> {
  const user = await getRequestUser(request);
  if (!user) return false;

  const role = await getActiveProfileRole(user.id);
  if (role === 'admin' || role === 'mestre_conselheiro') return true;
  return isConsultivoMember(user.id);
}

/** Apenas usuários ativos com cargo válido do painel podem vender números. */
export async function canSellRaffles(request: NextRequest): Promise<boolean> {
  const user = await getRequestUser(request);
  if (!user) return false;
  const role = await getActiveProfileRole(user.id);
  return !!role && (PANEL_ROLES as readonly string[]).includes(role);
}

export async function requireRaffleManager(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return { ok: false as const, status: 401 as const };
  const allowed = await canManageRaffles(request);
  if (!allowed) return { ok: false as const, status: 403 as const };
  return { ok: true as const, user };
}

export async function requireRaffleSeller(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return { ok: false as const, status: 401 as const };
  const role = await getActiveProfileRole(user.id);
  if (!role || !(PANEL_ROLES as readonly string[]).includes(role)) {
    return { ok: false as const, status: 403 as const };
  }
  return { ok: true as const, user, role };
}
