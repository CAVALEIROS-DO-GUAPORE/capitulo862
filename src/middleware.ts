import { NextResponse, type NextRequest } from 'next/server';
import {
  fetchMaintenanceEnabled,
  isMaintenanceBypassPath,
  isRequestFromAdmin,
} from '@/lib/maintenance';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isMaintenanceBypassPath(pathname)) {
    return NextResponse.next();
  }

  const maintenanceEnabled = await fetchMaintenanceEnabled();
  if (!maintenanceEnabled) {
    return NextResponse.next();
  }

  const isAdmin = await isRequestFromAdmin(request);
  if (isAdmin) {
    return NextResponse.next();
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
