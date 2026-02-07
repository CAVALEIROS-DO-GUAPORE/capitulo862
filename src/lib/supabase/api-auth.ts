import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export function createAuthenticatedClient(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}
