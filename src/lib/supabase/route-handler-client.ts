import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import { getSupabasePublicEnv } from '@/lib/supabase/env';

/** Cliente Supabase para Route Handlers — lê sessão dos cookies SSR do navegador. */
export function createRouteHandlerSupabaseClient(request: NextRequest) {
  const { url, anonKey } = getSupabasePublicEnv();
  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // Leitura de sessão apenas
        },
      },
    }
  );
}
