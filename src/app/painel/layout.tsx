'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AlertsBanner } from '@/components/AlertsBanner';

interface SessionUser {
  id?: string;
  email: string;
  role: string;
  name: string;
  avatarUrl?: string | null;
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
            const parsed = JSON.parse(stored);
            if (!parsed.id && session.user.id) {
              parsed.id = session.user.id;
              sessionStorage.setItem('dm_user', JSON.stringify(parsed));
            }
            setUser(parsed);
          } catch {
            const { data: profile } = await supabase
              .from('profiles')
              .select('email, name, role, avatar_url')
              .eq('id', session.user.id)
              .single();

            if (profile) {
              const userData = {
                id: session.user.id,
                email: profile.email || session.user.email || '',
                role: profile.role || 'membro',
                name: profile.name || 'Membro',
                avatarUrl: profile.avatar_url || null,
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
            .select('email, name, role, avatar_url')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            const userData = {
              id: session.user.id,
              email: profile.email || session.user.email || '',
              role: profile.role || 'membro',
              name: profile.name || 'Membro',
              avatarUrl: profile.avatar_url || null,
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onUserUpdated(e: Event) {
      const customEvent = e as CustomEvent<SessionUser | undefined>;
      if (customEvent.detail) {
        setUser(customEvent.detail);
        return;
      }
      const stored = sessionStorage.getItem('dm_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {}
      }
    }
    window.addEventListener('dm_user_updated', onUserUpdated);
    return () => window.removeEventListener('dm_user_updated', onUserUpdated);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const supabase = createClient();
    const channel = supabase
      .channel('profile-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          const newRow = payload.new as { email?: string; name?: string; role?: string; avatar_url?: string | null };
          setUser((prev) => {
            if (!prev) return prev;
            const updated = {
              ...prev,
              email: newRow.email ?? prev.email,
              name: newRow.name ?? prev.name,
              role: newRow.role ?? prev.role,
              avatarUrl: newRow.avatar_url ?? prev.avatarUrl,
            };
            sessionStorage.setItem('dm_user', JSON.stringify(updated));
            return updated;
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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
    ...(user ? (canViewCandidatos(user.role) ? [{ href: '/painel/usuarios', label: 'Usuários' }] : []) : []),
    { href: '/painel/membros', label: 'Membros' },
    { href: '/painel/noticias', label: 'Notícias' },
    { href: '/painel/calendario', label: 'Calendário' },
    { href: '/painel/financas', label: 'Finanças' },
    ...(user ? [{ href: '/painel/secretaria', label: 'Secretaria' }] : []),
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
          <Link href="/painel" className="flex items-center gap-2 shrink-0 min-w-0">
            <Image src="/logocapitulo.png" alt="Cap. Cavaleiros do Guaporé nº 862" width={120} height={44} className="h-9 w-auto shrink-0" priority />
            <span className="text-sm sm:text-base font-bold text-blue-800 truncate">Cap. Cavaleiros do Guaporé Nº 862</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/painel/perfil"
              className="flex items-center gap-2 text-slate-600 hover:text-blue-600 text-sm"
            >
              {user.avatarUrl ? (
                <div className="relative w-8 h-8 rounded-full overflow-hidden shrink-0">
                  <Image
                    src={user.avatarUrl}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized={user.avatarUrl.includes('supabase')}
                  />
                </div>
              ) : (
                <span className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-sm font-medium">
                  {user.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              )}
              <span className="hidden sm:inline">{user.name}</span>
            </Link>
            <button
              onClick={handleLogout}
              className="text-slate-600 hover:text-blue-600 text-sm"
            >
              Sair
            </button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-4 sm:gap-6 overflow-x-auto overflow-y-hidden py-3 sm:py-2 items-center min-h-[44px] [scrollbar-width:thin]">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm whitespace-nowrap py-2 -my-2 px-1 rounded hover:bg-slate-100 active:bg-slate-200 ${
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
      <AlertsBanner userRole={user?.role} />
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {children}
      </div>
    </div>
  );
}
