/**
 * Cargos que podem gerenciar usuários (criar/editar/excluir, convidar, redefinir senha).
 */
export const MANAGER_ROLES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro'] as const;

/**
 * Cargos do painel (rank interno). Usados ao criar/editar usuário.
 * Cargos do capítulo (Sênior, Consultor, etc.) ficam no cadastro de Membros.
 */
export const PANEL_ROLES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'tesoureiro', 'escrivao', 'membro'] as const;

export type ManagerRole = (typeof MANAGER_ROLES)[number];
export type PanelRole = (typeof PANEL_ROLES)[number];

export function isPanelRole(s: string): s is PanelRole {
  return (PANEL_ROLES as readonly string[]).includes(s);
}
