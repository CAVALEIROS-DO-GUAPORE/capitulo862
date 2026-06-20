import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestUser } from '@/lib/panel-auth';

export const CANDIDATE_EDITOR_ROLES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro'] as const;

export const CANDIDATE_VIEWER_PANEL_ROLES = [
  ...CANDIDATE_EDITOR_ROLES,
  'escrivao',
  'tesoureiro',
] as const;

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

async function isSeniorOrConsultorMember(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data: members } = await admin
    .from('members')
    .select('category, additional_roles')
    .eq('user_id', userId);

  for (const m of members || []) {
    if (m.category === 'seniores' || m.category === 'consultores') return true;
    const extras = m.additional_roles as { category?: string }[] | null;
    if (Array.isArray(extras) && extras.some((r) => r.category === 'seniores' || r.category === 'consultores')) {
      return true;
    }
  }
  return false;
}

export async function canEditCandidates(request: NextRequest): Promise<boolean> {
  const user = await getAuthenticatedUser(request);
  if (!user) return false;
  const role = await getActiveProfileRole(user.id);
  return role != null && CANDIDATE_EDITOR_ROLES.includes(role as (typeof CANDIDATE_EDITOR_ROLES)[number]);
}

export async function canViewCandidates(request: NextRequest): Promise<boolean> {
  const user = await getAuthenticatedUser(request);
  if (!user) return false;
  const role = await getActiveProfileRole(user.id);
  if (!role) return false;
  if (CANDIDATE_VIEWER_PANEL_ROLES.includes(role as (typeof CANDIDATE_VIEWER_PANEL_ROLES)[number])) {
    return true;
  }
  if (role === 'membro') {
    return isSeniorOrConsultorMember(user.id);
  }
  return false;
}
