'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPanelHomeCards } from '@/lib/panel-permissions';

export default function PainelPage() {
  const [user, setUser] = useState<{ role?: string } | null>(null);
  const [canViewCandidatos, setCanViewCandidatos] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!user?.role) return;
    fetch('/api/candidatos/access', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { canView: false }))
      .then((data) => setCanViewCandidatos(data.canView === true))
      .catch(() => setCanViewCandidatos(false));
  }, [user?.role]);

  const cards = user?.role ? getPanelHomeCards(user.role, { canViewCandidatos }) : [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-800 mb-6">
        Painel do Capítulo
      </h1>
      <p className="text-slate-600 mb-8">
        Bem-vindo à área interna. Selecione uma opção abaixo.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block p-6 bg-white rounded-xl border border-slate-200 hover:border-blue-400 shadow-sm transition-colors"
          >
            <h2 className="font-bold text-blue-800 mb-1">{card.label}</h2>
            <p className="text-slate-600 text-sm">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
