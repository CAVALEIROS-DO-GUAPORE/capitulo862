'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import type { News } from '@/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function NoticiasPage() {
  const [news, setNews] = useState<News[]>([]);

  useEffect(() => {
    fetch('/api/news')
      .then((r) => r.json())
      .then((data) => setNews(Array.isArray(data) ? data : []))
      .catch(() => setNews([]));
  }, []);

  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-800 mb-4 text-center">
          Notícias
        </h1>
        <p className="text-slate-600 text-center mb-12">
          Acompanhe as últimas novidades do Capítulo Cavaleiros do Guaporé nº 862.
        </p>

        <div className="space-y-8">
          {news.map((newsItem) => (
            <article
              key={newsItem.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-blue-400 shadow-sm transition-colors"
            >
              {newsItem.images && newsItem.images.length > 0 && (
                <div className="aspect-video relative bg-slate-100">
                  <Image
                    src={newsItem.images[0]}
                    alt={newsItem.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-6">
                <time className="text-slate-500 text-sm block">
                  {formatDate(newsItem.createdAt)}
                </time>
                <h2 className="text-xl font-bold text-blue-800 mt-1 mb-3">
                  {newsItem.title}
                </h2>
                <p className="text-slate-600">{newsItem.description}</p>
                {newsItem.images && newsItem.images.length > 1 && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {newsItem.images.slice(1).map((img, i) => (
                      <div
                        key={i}
                        className="aspect-video relative rounded overflow-hidden"
                      >
                        <Image
                          src={img}
                          alt={`${newsItem.title} - Foto ${i + 2}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>

        {news.length === 0 && (
          <p className="text-center text-slate-500 py-12">
            Nenhuma notícia publicada ainda.
          </p>
        )}
      </div>
    </div>
  );
}
