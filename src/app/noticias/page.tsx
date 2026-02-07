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
          {news.map((newsItem) => {
            const mainImage = newsItem.image || newsItem.images?.[0];
            return (
              <article
                key={newsItem.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-blue-400 shadow-sm transition-colors"
              >
                {mainImage && (
                  <div className="aspect-video relative bg-slate-100">
                    <Image
                      src={mainImage}
                      alt={newsItem.title}
                      fill
                      className="object-cover"
                      unoptimized={mainImage.includes('supabase')}
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
                  {newsItem.instagramUrl && (
                    <a
                      href={newsItem.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      Ver no Instagram
                    </a>
                  )}
                </div>
              </article>
            );
          })}
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
