'use client';

export type UserRole =
  | 'admin'
  | 'mestre_conselheiro'
  | 'primeiro_conselheiro'
  | 'escrivao'
  | 'tesoureiro'
  | 'membro';

export interface SessionUser {
  email: string;
  role: UserRole;
  name: string;
}

export function canManageMembers(role: UserRole): boolean {
  return ['admin', 'mestre_conselheiro', 'primeiro_conselheiro'].includes(role);
}

export function canPostNews(role: UserRole): boolean {
  return ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao'].includes(role);
}

export function canManageCalendar(role: UserRole): boolean {
  return ['admin', 'mestre_conselheiro', 'primeiro_conselheiro'].includes(role);
}

export function canManageMinutes(role: UserRole): boolean {
  return role === 'escrivao' || canManageMembers(role);
}

export function canManageFinance(role: UserRole): boolean {
  return role === 'tesoureiro' || canManageMembers(role);
}
