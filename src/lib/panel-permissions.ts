import { MANAGER_ROLES, PANEL_ROLES } from '@/lib/auth-constants';

/** Cargos com permissão de lançar/editar/excluir finanças. */
export const FINANCE_MANAGER_ROLES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'tesoureiro'] as const;

/** Cargos com permissão de criar/editar/excluir atas. */
export const MINUTES_MANAGER_ROLES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao'] as const;

/** Cargos com permissão de lançar/editar/excluir frequência. */
export const ROLL_CALL_MANAGER_ROLES = MINUTES_MANAGER_ROLES;

/** @deprecated Use FINANCE_MANAGER_ROLES */
export const FINANCE_VIEWER_ROLES = FINANCE_MANAGER_ROLES;

/** @deprecated Use MINUTES_MANAGER_ROLES */
export const MINUTES_VIEWER_ROLES = MINUTES_MANAGER_ROLES;

/** @deprecated Use ROLL_CALL_MANAGER_ROLES */
export const ROLL_CALL_VIEWER_ROLES = ROLL_CALL_MANAGER_ROLES;

/** Convites e gestão da secretaria (oficiais). */
export const SECRETARIA_OFFICER_ROLES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao', 'tesoureiro'] as const;

export { MANAGER_ROLES };

export function hasPanelRole(
  role: string | undefined | null,
  allowed: readonly string[]
): boolean {
  return !!role && allowed.includes(role);
}

export function canViewFinance(role: string | undefined | null): boolean {
  return hasPanelRole(role, PANEL_ROLES);
}

export function canManageFinance(role: string | undefined | null): boolean {
  return hasPanelRole(role, FINANCE_MANAGER_ROLES);
}

export function canViewMinutes(role: string | undefined | null): boolean {
  return hasPanelRole(role, PANEL_ROLES);
}

export function canManageMinutes(role: string | undefined | null): boolean {
  return hasPanelRole(role, MINUTES_MANAGER_ROLES);
}

export function canViewRollCalls(role: string | undefined | null): boolean {
  return hasPanelRole(role, PANEL_ROLES);
}

export function canManageRollCalls(role: string | undefined | null): boolean {
  return hasPanelRole(role, ROLL_CALL_MANAGER_ROLES);
}

export function canAccessSecretariaDownloads(role: string | undefined | null): boolean {
  return hasPanelRole(role, PANEL_ROLES);
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

export function canViewRaffles(role: string | undefined | null): boolean {
  return !!role;
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
  if (canViewRaffles(role)) {
    links.push({ href: '/painel/rifas', label: 'Sorteios' });
  }
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
  if (canViewRaffles(role)) {
    cards.push({
      href: '/painel/rifas',
      label: 'Sorteios',
      desc: 'Cadastrar sorteios e vender números',
    });
  }
  if (canViewMinutes(role)) {
    cards.push({ href: '/painel/atas', label: 'Atas', desc: 'Atas publicadas das reuniões' });
  }
  if (canViewRollCalls(role)) {
    cards.push({ href: '/painel/chamada', label: 'Frequência', desc: 'Presenças das reuniões' });
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
