'use client';

import Link from 'next/link';
import { hasPanelRole } from '@/lib/panel-permissions';

interface PanelAccessGateProps {
  role: string | undefined | null;
  allowed?: readonly string[];
  check?: (role: string) => boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export function PanelAccessGate({
  role,
  allowed = [],
  check,
  loading = false,
  children,
}: PanelAccessGateProps) {
  if (loading || role === undefined) {
    return (
      <div className="py-12 text-center text-slate-600">
        Carregando...
      </div>
    );
  }

  const permitted = role
    ? (check ? check(role) : hasPanelRole(role, allowed))
    : false;

  if (!permitted) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <h1 className="text-xl font-bold text-blue-800 mb-2">Sem permissão</h1>
        <p className="text-slate-600 mb-6 text-sm">
          Você não tem acesso a esta área do painel.
        </p>
        <Link
          href="/painel"
          className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
        >
          Voltar ao início
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
