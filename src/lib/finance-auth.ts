import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestUser } from '@/lib/panel-auth';

export const FINANCE_MANAGER_ROLES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'tesoureiro'] as const;

export async function getAuthenticatedUser(request: NextRequest) {
  return getRequestUser(request);
}

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

export async function canManageFinance(request: NextRequest): Promise<boolean> {
  const user = await getAuthenticatedUser(request);
  if (!user) return false;
  const role = await getActiveProfileRole(user.id);
  return role != null && FINANCE_MANAGER_ROLES.includes(role as (typeof FINANCE_MANAGER_ROLES)[number]);
}

export async function canViewFinance(request: NextRequest): Promise<boolean> {
  return isAuthenticatedPanelUser(request);
}

export async function isAuthenticatedPanelUser(request: NextRequest): Promise<boolean> {
  const user = await getAuthenticatedUser(request);
  if (!user) return false;
  const role = await getActiveProfileRole(user.id);
  return role != null;
}
