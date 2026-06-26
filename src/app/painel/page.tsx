'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPanelHomeCards } from '@/lib/panel-permissions';
import AttendanceRankingPanel from '@/components/AttendanceRankingPanel';

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-blue-800">Painel do Capítulo</h1>
        <p className="text-slate-600 mt-1">
          Bem-vindo à área interna. Acompanhe presenças e acesse os atalhos do painel.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-6 items-start">
        <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 xl:sticky xl:top-20">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 px-1">
            Menu rápido
          </h2>
          <nav className="space-y-2">
            {cards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="block rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-blue-50 hover:border-blue-200 px-4 py-3 transition-colors"
              >
                <span className="font-semibold text-blue-800 text-sm">{card.label}</span>
                {card.desc && (
                  <span className="block text-slate-500 text-xs mt-1 leading-snug">{card.desc}</span>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          <AttendanceRankingPanel />
        </section>
      </div>
    </div>
  );
}
