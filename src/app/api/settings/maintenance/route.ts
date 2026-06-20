import { NextResponse, type NextRequest } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapMaintenanceSettings } from '@/lib/maintenance-settings';

const SETTINGS_ID = 'default';
const SETTINGS_SELECT =
  'maintenance_enabled, maintenance_description, maintenance_return_date, maintenance_return_time, updated_at';

async function getAdminProfile(request: NextRequest) {
  const supabase = createAuthenticatedClient(request);
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, active')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin' || profile.active === false) {
    return null;
  }

  return user;
}

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('site_settings')
      .select(SETTINGS_SELECT)
      .eq('id', SETTINGS_ID)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(mapMaintenanceSettings(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAdminProfile(request);
  if (!user) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  let body: {
    enabled?: boolean;
    description?: string | null;
    returnDate?: string | null;
    returnTime?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }

  const hasEnabled = typeof body.enabled === 'boolean';
  const hasDescription = 'description' in body;
  const hasReturnDate = 'returnDate' in body;
  const hasReturnTime = 'returnTime' in body;

  if (!hasEnabled && !hasDescription && !hasReturnDate && !hasReturnTime) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  };

  if (hasEnabled) update.maintenance_enabled = body.enabled;
  if (hasDescription) {
    const desc = body.description?.trim() ?? '';
    update.maintenance_description = desc || null;
  }
  if (hasReturnDate) {
    update.maintenance_return_date = body.returnDate || null;
  }
  if (hasReturnTime) {
    update.maintenance_return_time = body.returnTime ? `${body.returnTime}:00` : null;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('site_settings')
      .update(update)
      .eq('id', SETTINGS_ID)
      .select(SETTINGS_SELECT)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(mapMaintenanceSettings(data));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
