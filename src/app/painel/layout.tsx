'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

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
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          sessionStorage.removeItem('dm_user');
          router.replace('/login');
          return;
        }

        const stored = sessionStorage.getItem('dm_user');
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, name, role')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              const userData = {
                email: profile.email || session.user.email || '',
                role: profile.role || 'membro',
                name: profile.name || 'Membro',
              };
              sessionStorage.setItem('dm_user', JSON.stringify(userData));
              setUser(userData);
            } else {
              router.replace('/login');
            }
          }
        } else {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, name, role')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            const userData = {
              email: profile.email || session.user.email || '',
              role: profile.role || 'membro',
              name: profile.name || 'Membro',
            };
            sessionStorage.setItem('dm_user', JSON.stringify(userData));
            setUser(userData);
          } else {
            router.replace('/login');
          }
        }
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
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

  if (loading || !user) {
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
          <div />
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
