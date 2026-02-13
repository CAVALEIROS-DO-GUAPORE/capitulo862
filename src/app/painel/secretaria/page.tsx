'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

/** Quem pode acessar Convites e Downloads (sem cadeado). Tesoureiro incluído. */
const ROLES_SECRETARIA_DOWNLOADS_CONVITES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao', 'tesoureiro'];

export default function SecretariaPage() {
  const [user, setUser] = useState<{ role: string } | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const canAccessConvites = user?.role && ROLES_SECRETARIA_DOWNLOADS_CONVITES.includes(user.role);
  const canAccessDownloads = user?.role && ROLES_SECRETARIA_DOWNLOADS_CONVITES.includes(user.role);

  const cardBase = 'block p-6 rounded-lg border transition-all text-center ';
  const cardEnabled = 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md ';
  const cardLocked = 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed ';

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-800 mb-2">Secretaria</h1>
      <p className="text-slate-600 mb-8">
        Escolha uma das opções abaixo. Itens com cadeado exigem permissão.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/painel/atas"
          className={cardBase + cardEnabled}
        >
          <span className="text-lg font-semibold text-blue-800">Atas</span>
          <p className="text-slate-500 text-sm mt-1">Atas das reuniões</p>
        </Link>

        <Link
          href="/painel/chamada"
          className={cardBase + cardEnabled}
        >
          <span className="text-lg font-semibold text-blue-800">Frequência</span>
          <p className="text-slate-500 text-sm mt-1">Chamada e presenças</p>
        </Link>

        {canAccessConvites ? (
          <Link
            href="/painel/convites"
            className={cardBase + cardEnabled}
          >
            <span className="text-lg font-semibold text-blue-800">Convites</span>
            <p className="text-slate-500 text-sm mt-1">Gerenciar convites</p>
          </Link>
        ) : (
          <div className={cardBase + cardLocked} title="Sem permissão para acessar Convites">
            <span className="text-lg font-semibold text-slate-600">Convites</span>
            <p className="text-slate-500 text-sm mt-1">Gerenciar convites</p>
            <p className="text-slate-400 text-xs mt-2 flex items-center justify-center gap-1">
              <LockIcon /> Acesso restrito
            </p>
          </div>
        )}

        {canAccessDownloads ? (
          <Link
            href="/painel/downloads"
            className={cardBase + cardEnabled}
          >
            <span className="text-lg font-semibold text-blue-800">Downloads</span>
            <p className="text-slate-500 text-sm mt-1">Modelos e relatórios para download</p>
          </Link>
        ) : (
          <div className={cardBase + cardLocked} title="Sem permissão para acessar Downloads">
            <span className="text-lg font-semibold text-slate-600">Downloads</span>
            <p className="text-slate-500 text-sm mt-1">Modelos e relatórios para download</p>
            <p className="text-slate-400 text-xs mt-2 flex items-center justify-center gap-1">
              <LockIcon /> Acesso restrito
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
