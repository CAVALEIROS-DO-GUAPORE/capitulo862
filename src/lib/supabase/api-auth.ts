import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  const bearer = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (bearer) return bearer;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
  const ref = match ? match[1] : '';
  if (!ref) return null;

  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  const name = `sb-${ref}-auth-token`;
  const part = cookieHeader.split(';').map((s) => s.trim()).find((s) => s.startsWith(name + '='));
  if (!part) return null;
  const value = decodeURIComponent(part.slice(name.length + 1));
  try {
    const data = JSON.parse(value) as { access_token?: string };
    return data.access_token || null;
  } catch {
    return null;
  }
}

export function createAuthenticatedClient(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
