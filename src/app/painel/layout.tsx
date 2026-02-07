'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

interface SessionUser {
  email: string;
  role: string;
  name: string;
}

export default function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem('dm_user');
    if (!stored) {
      router.replace('/login');
      return;
    }
    try {
      setUser(JSON.parse(stored));
    } catch {
      router.replace('/login');
    }
  }, [router]);

  function handleLogout() {
    sessionStorage.removeItem('dm_user');
    router.replace('/login');
    router.refresh();
  }

  const canViewCandidatos = (role: string) =>
    ['admin', 'mestre_conselheiro', 'primeiro_conselheiro'].includes(role);

  const links = [
    { href: '/painel', label: 'Início' },
    ...(user ? (canViewCandidatos(user.role) ? [{ href: '/painel/candidatos', label: 'Candidaturas' }] : []) : []),
    { href: '/painel/membros', label: 'Membros' },
    { href: '/painel/noticias', label: 'Notícias' },
    { href: '/painel/calendario', label: 'Calendário' },
    { href: '/painel/atas', label: 'Atas' },
    { href: '/painel/financas', label: 'Finanças' },
  ];

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/painel" className="font-bold text-blue-800">
            Painel · Cav. Guaporé 862
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-slate-600 text-sm hidden sm:inline">
              {user.name}
            </span>
            <button
              onClick={handleLogout}
              className="text-slate-600 hover:text-blue-600 text-sm"
            >
              Sair
            </button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-6 overflow-x-auto py-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm whitespace-nowrap ${
                pathname === link.href
                  ? 'text-blue-600 font-semibold'
                  : 'text-slate-600 hover:text-blue-600'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
}
