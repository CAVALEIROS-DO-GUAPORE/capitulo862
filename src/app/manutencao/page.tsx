'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { formatReturnDateTime } from '@/lib/maintenance-settings';

const DEFAULT_DESCRIPTION =
  'Estamos realizando melhorias no site do Capítulo Cavaleiros do Guaporé Nº 862.';

export default function ManutencaoPage() {
  const [description, setDescription] = useState(DEFAULT_DESCRIPTION);
  const [returnDate, setReturnDate] = useState<string | null>(null);
  const [returnTime, setReturnTime] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings/maintenance');
        if (!res.ok) return;
        const data = await res.json();
        if (data.description) setDescription(data.description);
        setReturnDate(data.returnDate ?? null);
        setReturnTime(data.returnTime ?? null);
      } catch {
        // mantém textos padrão
      }
    }
    loadSettings();
  }, []);

  const returnLabel = formatReturnDateTime(returnDate, returnTime);

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-12 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: 'url(/fundodm.png)' }}
    >
      <div className="absolute inset-0 bg-blue-900/80" aria-hidden />
      <div className="relative z-10 w-full max-w-lg text-center">
        <Image
          src="/logocapitulo.png"
          alt="Cap. Cavaleiros do Guaporé nº 862"
          width={240}
          height={96}
          priority
          className="mx-auto mb-6 h-20 w-auto drop-shadow-lg"
        />
        <div className="bg-white/95 backdrop-blur rounded-2xl border border-white/20 shadow-xl p-8 sm:p-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 text-amber-700 mb-5">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-3">
            Site em manutenção
          </h1>
          <p className="text-slate-600 mb-4 whitespace-pre-line">{description}</p>
          {returnLabel ? (
            <p className="text-blue-700 font-medium text-sm sm:text-base mb-8 capitalize">
              Previsão de retorno: {returnLabel}
            </p>
          ) : (
            <p className="text-slate-500 text-sm mb-8">
              Voltaremos em breve. Obrigado pela compreensão.
            </p>
          )}
          <Link
            href="/login"
            className="inline-block text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Área do administrador
          </Link>
        </div>
      </div>
    </div>
  );
}
