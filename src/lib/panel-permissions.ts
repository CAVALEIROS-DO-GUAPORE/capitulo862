import { MANAGER_ROLES } from '@/lib/auth-constants';

/** Cargos com acesso de leitura a finanças (alinhado às APIs). */
export const FINANCE_VIEWER_ROLES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'tesoureiro'] as const;

/** Cargos com acesso a atas internas. */
export const MINUTES_VIEWER_ROLES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao'] as const;

/** Cargos com acesso à frequência/chamada. */
export const ROLL_CALL_VIEWER_ROLES = MINUTES_VIEWER_ROLES;

/** Convites, downloads e relatórios da secretaria. */
export const SECRETARIA_OFFICER_ROLES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao', 'tesoureiro'] as const;

export { MANAGER_ROLES };

export function hasPanelRole(
  role: string | undefined | null,
  allowed: readonly string[]
): boolean {
  return !!role && allowed.includes(role);
}

export function canViewFinance(role: string | undefined | null): boolean {
  return hasPanelRole(role, FINANCE_VIEWER_ROLES);
}

export function canViewMinutes(role: string | undefined | null): boolean {
  return hasPanelRole(role, MINUTES_VIEWER_ROLES);
}

export function canViewRollCalls(role: string | undefined | null): boolean {
  return hasPanelRole(role, ROLL_CALL_VIEWER_ROLES);
}

export function canAccessSecretariaDownloads(role: string | undefined | null): boolean {
  return hasPanelRole(role, SECRETARIA_OFFICER_ROLES);
}

export function canManageUsers(role: string | undefined | null): boolean {
  return hasPanelRole(role, MANAGER_ROLES);
}

export function canAccessSecretaria(role: string | undefined | null): boolean {
  return (
    canViewMinutes(role) ||
    canViewRollCalls(role) ||
    canAccessSecretariaDownloads(role)
  );
}

export interface PanelNavItem {
  href: string;
  label: string;
  desc?: string;
}

export function getPanelNavLinks(
  role: string,
  opts?: { canViewCandidatos?: boolean }
): PanelNavItem[] {
  const links: PanelNavItem[] = [{ href: '/painel', label: 'Início' }];

  if (role === 'admin') {
    links.push({ href: '/painel/manutencao', label: 'Manutenção' });
  }
  if (opts?.canViewCandidatos) {
    links.push({ href: '/painel/candidatos', label: 'Candidaturas' });
  }
  if (canManageUsers(role)) {
    links.push({ href: '/painel/usuarios', label: 'Usuários' });
  }
  links.push(
    { href: '/painel/membros', label: 'Membros' },
    { href: '/painel/noticias', label: 'Notícias' },
    { href: '/painel/calendario', label: 'Calendário' }
  );
  if (canViewFinance(role)) {
    links.push({ href: '/painel/financas', label: 'Finanças' });
  }
  if (canAccessSecretaria(role)) {
    links.push({ href: '/painel/secretaria', label: 'Secretaria' });
  }

  return links;
}

export function getPanelHomeCards(
  role: string,
  opts?: { canViewCandidatos?: boolean }
): PanelNavItem[] {
  const cards: PanelNavItem[] = [];

  if (role === 'admin') {
    cards.push({
      href: '/painel/manutencao',
      label: 'Manutenção',
      desc: 'Ativar ou desativar modo manutenção',
    });
  }
  if (opts?.canViewCandidatos) {
    cards.push({
      href: '/painel/candidatos',
      label: 'Candidaturas',
      desc: 'Formulários e sindicâncias',
    });
  }
  if (canManageUsers(role)) {
    cards.push({
      href: '/painel/usuarios',
      label: 'Usuários',
      desc: 'Gerenciar acessos ao painel',
    });
  }
  cards.push(
    { href: '/painel/membros', label: 'Membros', desc: 'Ver membros do capítulo' },
    { href: '/painel/noticias', label: 'Notícias', desc: 'Ver e publicar notícias' },
    { href: '/painel/calendario', label: 'Calendário', desc: 'Eventos e ritualísticas' }
  );
  if (canViewMinutes(role)) {
    cards.push({ href: '/painel/atas', label: 'Atas', desc: 'Atas internas das reuniões' });
  }
  if (canViewFinance(role)) {
    cards.push({
      href: '/painel/financas',
      label: 'Finanças',
      desc: 'Caixa e prestação de contas',
    });
  }
  if (canAccessSecretaria(role)) {
    cards.push({
      href: '/painel/secretaria',
      label: 'Secretaria',
      desc: 'Chamadas, downloads e relatórios',
    });
  }

  return cards;
}
