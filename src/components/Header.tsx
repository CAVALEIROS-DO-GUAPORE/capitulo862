'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Início' },
    { href: '/sobre', label: 'Sobre Nós' },
    { href: '/membros', label: 'Membros' },
    { href: '/noticias', label: 'Notícias' },
    { href: '/login', label: 'Área do Membro' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <Image src="/logocapitulo.png" alt="Cavaleiros do Guaporé nº 862" width={180} height={48} priority className="h-10 sm:h-12 w-auto shrink-0" />
          <span className="text-sm sm:text-lg font-bold text-blue-800 truncate">Cap. Cavaleiros do Guaporé Nº 862</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-slate-600 hover:text-blue-600 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 text-slate-600 hover:text-blue-600"
          aria-label="Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-slate-200 py-4 px-4 flex flex-col gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-slate-600 hover:text-blue-600 py-2 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
