import { NextRequest } from 'next/server';
import { getTokenFromRequest } from '@/lib/supabase/api-auth';

const SETTINGS_ID = 'default';

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, anonKey, serviceKey };
}

export async function fetchMaintenanceEnabled(): Promise<boolean> {
  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) return false;

  try {
    const res = await fetch(
      `${url}/rest/v1/site_settings?id=eq.${SETTINGS_ID}&select=maintenance_enabled`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        cache: 'no-store',
      }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { maintenance_enabled?: boolean }[];
    return data[0]?.maintenance_enabled === true;
  } catch {
    return false;
  }
}

export async function isRequestFromAdmin(request: NextRequest): Promise<boolean> {
  const token = getTokenFromRequest(request);
  if (!token) return false;

  const { url, anonKey, serviceKey } = getSupabaseConfig();
  const apiKey = serviceKey || anonKey;
  if (!url || !apiKey) return false;

  try {
    const userRes = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    if (!userRes.ok) return false;

    const user = (await userRes.json()) as { id?: string };
    if (!user.id) return false;

    const profileRes = await fetch(
      `${url}/rest/v1/profiles?id=eq.${user.id}&select=role,active`,
      {
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${serviceKey || token}`,
        },
        cache: 'no-store',
      }
    );
    if (!profileRes.ok) return false;

    const profiles = (await profileRes.json()) as { role?: string; active?: boolean }[];
    const profile = profiles[0];
    return profile?.role === 'admin' && profile?.active !== false;
  } catch {
    return false;
  }
}

export function isMaintenanceBypassPath(pathname: string): boolean {
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/settings/maintenance') ||
    pathname === '/manutencao' ||
    pathname === '/login' ||
    pathname === '/icon' ||
    pathname.endsWith('.ico') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.svg') ||
    pathname === '/manifest.json'
  ) {
    return true;
  }
  return false;
}
