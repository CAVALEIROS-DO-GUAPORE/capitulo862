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

/** Mestre Conselheiro, admin e Conselho Consultivo podem ler as manifestações. */
export async function canViewFeedback(request: NextRequest): Promise<boolean> {
  const user = await getRequestUser(request);
  if (!user) return false;

  const role = await getActiveProfileRole(user.id);
  if (role === 'admin' || role === 'mestre_conselheiro') return true;
  return isConsultorMember(user.id);
}

/** Qualquer usuário ativo do painel pode enviar. */
export async function canSubmitFeedback(request: NextRequest): Promise<boolean> {
  const user = await getRequestUser(request);
  if (!user) return false;
  const role = await getActiveProfileRole(user.id);
  return role != null;
}

export async function requireFeedbackViewer(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return { ok: false as const, status: 401 as const };
  const allowed = await canViewFeedback(request);
  if (!allowed) return { ok: false as const, status: 403 as const };
  return { ok: true as const, user };
}
