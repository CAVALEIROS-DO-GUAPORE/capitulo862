/** Rotas de API acessíveis sem login (site público). */
export function isPublicApiRoute(method: string, pathname: string): boolean {
  const m = method.toUpperCase();

  if (m === 'GET') {
    if (pathname === '/api/members') return true;
    if (pathname === '/api/news') return true;
    if (pathname === '/api/calendar/next-event') return true;
    if (pathname === '/api/settings/maintenance') return true;
  }

  if (m === 'POST' && pathname === '/api/candidatos') return true;

  return false;
}
