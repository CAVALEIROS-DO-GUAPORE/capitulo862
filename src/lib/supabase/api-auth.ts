import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

function getProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : null;
}

function readAccessTokenFromCookies(request: NextRequest, ref: string): string | null {
  const prefix = `sb-${ref}-auth-token`;
  const cookies = request.cookies.getAll().filter((c) => c.name === prefix || c.name.startsWith(`${prefix}.`));

  if (cookies.length === 0) {
    const header = request.headers.get('cookie');
    if (!header) return null;
    const parts = header.split(';').map((s) => s.trim());
    const chunks = parts
      .filter((p) => p.startsWith(prefix))
      .sort((a, b) => {
        const idx = (s: string) => {
          const m = s.match(/\.(\d+)=/);
          return m ? parseInt(m[1], 10) : 0;
        };
        return idx(a) - idx(b);
      });
    if (chunks.length === 0) return null;
    const raw = chunks.map((c) => decodeURIComponent(c.slice(c.indexOf('=') + 1))).join('');
    try {
      const data = JSON.parse(raw) as { access_token?: string };
      return data.access_token || null;
    } catch {
      return null;
    }
  }

  const single = cookies.find((c) => c.name === prefix);
  if (single) {
    try {
      const data = JSON.parse(single.value) as { access_token?: string };
      return data.access_token || null;
    } catch {
      return null;
    }
  }

  const chunked = cookies
    .filter((c) => c.name.startsWith(`${prefix}.`))
    .sort((a, b) => {
      const idx = (name: string) => parseInt(name.split('.').pop() || '0', 10);
      return idx(a.name) - idx(b.name);
    })
    .map((c) => c.value)
    .join('');

  try {
    const data = JSON.parse(chunked) as { access_token?: string };
    return data.access_token || null;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  const bearer = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (bearer) return bearer;

  const ref = getProjectRef();
  if (!ref) return null;

  return readAccessTokenFromCookies(request, ref);
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
