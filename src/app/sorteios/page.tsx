'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import type { PublicRaffle } from '@/types';
import { formatCurrency, formatDrawDate, whatsappUrl } from '@/lib/raffles-utils';

const VISIBLE_ROWS = 4;
const CELL_HEIGHT = '2rem';

function gridCols(total: number): number {
  if (total <= 50) return 5;
  if (total <= 200) return 10;
  return 15;
}

function NumberGrid({ raffle }: { raffle: PublicRaffle }) {
  const soldMap = new Map(raffle.soldNumbers.map((s) => [s.number, s.buyerName]));
  const cols = gridCols(raffle.totalNumbers);
  const gapPx = 4;
  const maxHeight = `calc(${VISIBLE_ROWS} * ${CELL_HEIGHT} + ${VISIBLE_ROWS - 1} * ${gapPx}px)`;

  return (
    <div
      className="overflow-y-auto rounded-lg border border-slate-100 pr-1"
      style={{ maxHeight }}
    >
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: raffle.totalNumbers }, (_, i) => i + 1).map((num) => {
          const buyer = soldMap.get(num);
          const sold = !!buyer;
          return (
            <div
              key={num}
              title={sold ? `${num} — ${buyer}` : `${num} — disponível`}
              style={{ height: CELL_HEIGHT }}
              className={`rounded flex flex-col items-center justify-center text-center px-0.5 border text-[9px] sm:text-[10px] leading-tight ${
                sold
                  ? 'bg-blue-100 border-blue-300 text-blue-900'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <span className="font-bold leading-none">{num}</span>
              {sold && (
                <span className="truncate w-full text-[7px] sm:text-[8px] font-medium leading-none mt-0.5">
                  {buyer}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SorteiosPublicPage() {
  const [raffles, setRaffles] = useState<PublicRaffle[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRaffles = useCallback(function loadRaffles() {
    fetch('/api/raffles/public')
      .then((r) => r.json())
      .then((data) => setRaffles(Array.isArray(data) ? data : []))
      .catch(() => setRaffles([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadRaffles();
  }, [loadRaffles]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('sorteios-public-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'raffle_sale_numbers' },
        () => loadRaffles()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRaffles]);

  return (
    <div className="py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-blue-800 mb-1 text-center">Sorteios</h1>
        <p className="text-slate-600 text-center text-sm mb-6">
          Números vendidos e sorteios em andamento do Capítulo Cavaleiros do Guaporé nº 862.
        </p>

        {loading && (
          <p className="text-center text-slate-500 text-sm">Carregando sorteios...</p>
        )}

        {!loading && raffles.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-6 text-center text-slate-500 text-sm">
            Nenhum sorteio ativo no momento.
          </div>
        )}

        <div className="space-y-5">
          {raffles.map((raffle) => {
            const soldCount = raffle.soldNumbers.length;
            const available = raffle.totalNumbers - soldCount;
            const waLink = whatsappUrl(
              raffle.whatsappContact,
              `Olá! Tenho interesse em comprar número(s) do sorteio "${raffle.title}".`
            );

            return (
              <article
                key={raffle.id}
                className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden"
              >
                {raffle.bannerUrl && (
                  <div className="relative w-full h-36 sm:h-44 bg-slate-100">
                    <Image
                      src={raffle.bannerUrl}
                      alt={raffle.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 672px) 100vw, 672px"
                      unoptimized={raffle.bannerUrl.includes('supabase')}
                    />
                  </div>
                )}
                <div className="p-4 border-b border-slate-100">
                  <h2 className="text-lg font-bold text-blue-800">{raffle.title}</h2>
                  {raffle.description && (
                    <p className="text-slate-600 text-xs mt-1 whitespace-pre-wrap">{raffle.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="bg-slate-50 rounded-md p-2">
                      <span className="text-slate-500 block">Valor/número</span>
                      <span className="font-bold text-blue-800">{formatCurrency(raffle.pricePerNumber)}</span>
                    </div>
                    <div className="bg-slate-50 rounded-md p-2">
                      <span className="text-slate-500 block">Sorteio</span>
                      <span className="font-semibold text-slate-800 leading-snug">
                        {formatDrawDate(raffle.drawAt)}
                      </span>
                    </div>
                    <div className="bg-slate-50 rounded-md p-2 col-span-2">
                      <span className="text-slate-500 block">Prêmio(s)</span>
                      <ul className="list-disc list-inside text-slate-800">
                        {raffle.prizes.map((prize, i) => (
                          <li key={i}>{prize}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-slate-50 rounded-md p-2">
                      <span className="text-slate-500 block">Vendidos</span>
                      <span className="font-semibold text-slate-800">
                        {soldCount} / {raffle.totalNumbers}
                      </span>
                    </div>
                    <div className="bg-slate-50 rounded-md p-2">
                      <span className="text-slate-500 block">Disponíveis</span>
                      <span className="font-semibold text-green-700">{available}</span>
                    </div>
                  </div>

                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center justify-center gap-1.5 w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Quero comprar — WhatsApp
                  </a>
                </div>

                <div className="p-4">
                  <h3 className="text-xs font-semibold text-slate-700 mb-2">
                    Mapa de números
                    <span className="font-normal text-slate-500 ml-1">
                      (role para ver todos · azul = vendido)
                    </span>
                  </h3>
                  <NumberGrid raffle={raffle} />
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
