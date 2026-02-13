'use client';

import { useEffect, useState } from 'react';

const ROLES_CONVITES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao', 'tesoureiro'];

export default function PainelConvitesPage() {
  const [user, setUser] = useState<{ role: string } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const canAccess = user?.role && ROLES_CONVITES.includes(user.role);

  if (!canAccess) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-blue-800 mb-6">Convites</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <p className="text-amber-800 font-medium">Sem permissão</p>
          <p className="text-amber-700 text-sm mt-1">
            Apenas escrivão, tesoureiro, Mestre Conselheiro, 1º Conselheiro e admin podem acessar esta área.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-800 mb-6">Convites</h1>
      <p className="text-slate-600 mb-6">
        Área de convites. Conteúdo em construção.
      </p>
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
        Em breve você poderá gerenciar convites aqui.
      </div>
    </div>
  );
}
