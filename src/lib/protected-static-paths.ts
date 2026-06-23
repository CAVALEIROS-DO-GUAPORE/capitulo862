/** Arquivos internos que não devem ser servidos diretamente de /public. */
export function isSensitiveStaticPath(pathname: string): boolean {
  const p = pathname.toLowerCase();
  if (p.startsWith('/cerimonias/')) return true;
  if (p.startsWith('/candidaturas/')) return true;
  if (p === '/modelo_oficio.docx') return true;
  return false;
}
