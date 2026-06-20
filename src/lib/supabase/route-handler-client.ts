import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';

/** Cliente Supabase para Route Handlers — lê sessão dos cookies SSR do navegador. */
export function createRouteHandlerSupabaseClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
