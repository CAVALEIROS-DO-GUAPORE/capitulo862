import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createRouteHandlerSupabaseClient } from '@/lib/supabase/route-handler-client';
import { createAdminClient } from '@/lib/supabase/admin';
import { MANAGER_ROLES } from '@/lib/auth-constants';

export { MANAGER_ROLES };

export const NEWS_EDITOR_ROLES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao'] as const;
export const MINUTES_EDITOR_ROLES = NEWS_EDITOR_ROLES;
export const CALENDAR_EDITOR_ROLES = MANAGER_ROLES;
export const MEMBERS_EDITOR_ROLES = MANAGER_ROLES;
export const FINANCE_EDITOR_ROLES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'tesoureiro'] as const;
export const ROLL_CALL_EDITOR_ROLES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao'] as const;

export type PanelAuthResult =
  | { ok: true; user: User; role: string }
  | { ok: false; response: NextResponse };

export async function getActiveProfileRole(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, active')
    .eq('id', userId)
    .single();
  if (!profile || profile.active === false) return null;
  return profile.role as string;
}

export async function getRequestUser(request: NextRequest): Promise<User | null> {
  const bearerClient = createAuthenticatedClient(request);
  if (bearerClient) {
    const { data: { user } } = await bearerClient.auth.getUser();
    if (user) return user;
  }

  const supabase = createRouteHandlerSupabaseClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}

export async function requirePanelUser(request: NextRequest): Promise<PanelAuthResult> {
  const user = await getRequestUser(request);
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Não autorizado' }, { status: 401 }) };
  }

  const role = await getActiveProfileRole(user.id);
  if (!role) {
    return { ok: false, response: NextResponse.json({ error: 'Conta inativa ou sem perfil' }, { status: 403 }) };
  }

  return { ok: true, user, role };
}

export async function requireRoles(
  request: NextRequest,
  roles: readonly string[]
): Promise<PanelAuthResult> {
  const auth = await requirePanelUser(request);
  if (!auth.ok) return auth;
  if (!roles.includes(auth.role)) {
    return { ok: false, response: NextResponse.json({ error: 'Sem permissão' }, { status: 403 }) };
  }
  return auth;
}
