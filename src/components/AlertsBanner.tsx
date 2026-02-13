'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CalendarEventAlert {
  id: string;
  title: string;
  description?: string;
  date: string;
  startTime?: string;
  dateEnd?: string;
}

interface BirthdaysData {
  birthdays: { id: string; name: string }[];
  chapterAnniversary: boolean;
  chapterYears: number | null;
  alumniAnniversary: boolean;
  alumniYears: number | null;
}

const ROLES_ALERTA_ATIVIDADES = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao', 'tesoureiro', 'presidente_consultivo'];

export function AlertsBanner({ userRole }: { userRole?: string }) {
  const [nextEvent, setNextEvent] = useState<CalendarEventAlert | null>(null);
  const [activities, setActivities] = useState<CalendarEventAlert[]>([]);
  const [birthdaysData, setBirthdaysData] = useState<BirthdaysData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch('/api/calendar/next-event').then((r) => r.json()),
      userRole && ROLES_ALERTA_ATIVIDADES.includes(userRole)
        ? fetch('/api/calendar/upcoming-activities').then((r) => r.json())
        : Promise.resolve([]),
      fetch('/api/birthdays').then((r) => r.json()),
    ])
      .then(([event, acts, bday]) => {
        if (cancelled) return;
        setNextEvent(event && event.id ? event : null);
        setActivities(Array.isArray(acts) ? acts.filter((a: CalendarEventAlert) => a && a.id) : []);
        setBirthdaysData(bday && typeof bday.chapterAnniversary === 'boolean' ? bday : null);
      })
      .catch(() => {
        if (!cancelled) {
          setNextEvent(null);
          setActivities([]);
          setBirthdaysData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userRole]);

  const hasAnniversaries = birthdaysData && (
    birthdaysData.chapterAnniversary
    || birthdaysData.alumniAnniversary
    || (birthdaysData.birthdays && birthdaysData.birthdays.length > 0)
  );
  const hasEventOrActivities = nextEvent || activities.length > 0;
  if (loading || (!hasAnniversaries && !hasEventOrActivities)) return null;

  const formatDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
      <div className="max-w-6xl mx-auto flex flex-col gap-3 text-sm">
        {birthdaysData && (birthdaysData.chapterAnniversary || birthdaysData.alumniAnniversary || (birthdaysData.birthdays?.length > 0)) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {birthdaysData.chapterAnniversary && (
              <div className="font-medium text-amber-900">
                🎉 Hoje é o aniversário de fundação e instalação do nosso Capítulo! {birthdaysData.chapterYears != null && `${birthdaysData.chapterYears} anos.`}
              </div>
            )}
            {birthdaysData.alumniAnniversary && (
              <div className="font-medium text-amber-900">
                🎉 Hoje é o aniversário do Colégio Alumni (Sêniores)! {birthdaysData.alumniYears != null && `${birthdaysData.alumniYears} anos.`}
              </div>
            )}
            {birthdaysData.birthdays && birthdaysData.birthdays.length > 0 && (
              <div>
                <span className="text-amber-800 font-medium">Aniversariantes do dia: </span>
                <span className="text-amber-900">
                  {birthdaysData.birthdays.map((b) => b.name).join(', ')}
                  {' — '}
                  Parabéns! Anuncie aos irmãos.
                </span>
              </div>
            )}
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {nextEvent && (
              <div>
                <span className="text-amber-800 font-medium">Próximo evento: </span>
                <span className="text-amber-900">
                  {nextEvent.title}
                  {' — '}
                  {formatDate(nextEvent.date)}
                  {nextEvent.startTime ? ` ${nextEvent.startTime}` : ''}
                  {nextEvent.description ? ` · ${nextEvent.description.slice(0, 60)}${nextEvent.description.length > 60 ? '…' : ''}` : ''}
                </span>
              </div>
            )}
            {activities.length > 0 && (
              <div>
                <span className="text-amber-800 font-medium">Atividades a entregar: </span>
                <span className="text-amber-900">
                  {activities.slice(0, 2).map((a) => (
                    <span key={a.id}>
                      {a.title} (até {a.dateEnd ? formatDate(a.dateEnd) : formatDate(a.date)})
                      {activities.indexOf(a) < Math.min(2, activities.length) - 1 ? '; ' : ''}
                    </span>
                  ))}
                  {activities.length > 2 && ` +${activities.length - 2} mais`}
                </span>
              </div>
            )}
          </div>
          <Link
            href="/painel/calendario"
            className="text-amber-800 font-medium hover:underline shrink-0"
          >
            Ver calendário →
          </Link>
        </div>
      </div>
    </div>
  );
}
