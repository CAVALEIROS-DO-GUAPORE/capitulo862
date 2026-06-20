import { NextResponse, type NextRequest } from 'next/server';
import {
  fetchMaintenanceEnabled,
  isMaintenanceBypassPath,
  isSupabaseUserAdmin,
} from '@/lib/maintenance';
import { isPublicApiRoute } from '@/lib/api-public-routes';
import { createMiddlewareSupabaseClient } from '@/lib/supabase/middleware-client';

async function hasActivePanelSession(request: NextRequest): Promise<boolean> {
  const { supabase } = createMiddlewareSupabaseClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('active')
    .eq('id', user.id)
    .single();

  return profile?.active !== false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { supabase, getResponse } = createMiddlewareSupabaseClient(request);

  if (pathname.startsWith('/painel')) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('active')
      .eq('id', user.id)
      .single();

    if (profile?.active === false) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'inactive');
      return NextResponse.redirect(url);
    }
  }

  if (pathname.startsWith('/api/') && !isPublicApiRoute(request.method, pathname)) {
    const allowed = await hasActivePanelSession(request);
    if (!allowed) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
  }

  if (isMaintenanceBypassPath(pathname)) {
    return getResponse();
  }

  const maintenanceEnabled = await fetchMaintenanceEnabled();
  if (!maintenanceEnabled) {
    return getResponse();
  }

  const isAdmin = await isSupabaseUserAdmin(supabase);
  if (isAdmin) {
    return getResponse();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/manutencao';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|logocapitulo\\.png|logocapitulo\\.ico|fundodm\\.png|manifest\\.json).*)',
  ],
};
