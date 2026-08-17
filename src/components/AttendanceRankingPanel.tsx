'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AttendanceRankingEntry, MeetingType, Member } from '@/types';
import type { RankingMemberCategory } from '@/lib/meeting-attendance';

interface RankingSection {
  label: string;
  items: AttendanceRankingEntry[];
  totalMeetings: number;
}

interface RankingResponse {
  activeGestao: string;
  selectedGestao: string;
  selectedMemberCategory: RankingMemberCategory;
  memberCategoryOptions: { value: RankingMemberCategory; label: string }[];
  gestaoOptions: { value: string; label: string }[];
  rankings: Record<MeetingType, RankingSection>;
}

const TYPE_ORDER: MeetingType[] = ['ritualistica', 'administrativa', 'controle'];
const PREVIEW_LIMIT = 5;
const MEDALS = ['🥇', '🥈', '🥉'] as const;

function MemberAvatar({ name, photo, position }: { name: string; photo?: string; position: number }) {
  const isPodium = position < 3;

  return (
    <div className="relative shrink-0">
      {isPodium && (
        <span
          className="absolute -top-2 -left-2 z-10 text-[1.35rem] leading-none select-none drop-shadow-sm"
          title={`${position + 1}º lugar`}
          aria-hidden
        >
          {MEDALS[position]}
        </span>
      )}
      <div
        className={`rounded-full overflow-hidden bg-slate-100 flex items-center justify-center ${
          isPodium ? 'w-12 h-12 ring-2 ring-white shadow-md' : 'w-10 h-10 ring-1 ring-slate-200'
        }`}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className={`font-semibold text-slate-500 ${isPodium ? 'text-base' : 'text-sm'}`}>
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      {!isPodium && (
        <span className="absolute -bottom-1 -right-1 z-10 min-w-[1.125rem] h-[1.125rem] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shadow">
          {position + 1}
        </span>
      )}
    </div>
  );
}

function RankingList({
  items,
  photoFor,
}: {
  items: AttendanceRankingEntry[];
  photoFor: (item: AttendanceRankingEntry) => string | undefined;
}) {
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li
          key={item.memberId}
          className={`flex items-center gap-3 rounded-xl px-2 py-2.5 -mx-2 ${
            index === 0
              ? 'bg-amber-50/80'
              : index === 1
                ? 'bg-slate-50/90'
                : index === 2
                  ? 'bg-orange-50/60'
                  : ''
          }`}
        >
          <MemberAvatar name={item.name} photo={photoFor(item)} position={index} />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-slate-800 truncate">{item.name}</p>
            <p className="text-sm text-slate-600">
              {item.count} presença{item.count === 1 ? '' : 's'} · {item.percentage}% de frequência
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function AttendanceRankingPanel() {
  const [data, setData] = useState<RankingResponse | null>(null);
  const [photoByMemberId, setPhotoByMemberId] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [gestao, setGestao] = useState('');
  const [memberCategory, setMemberCategory] = useState<RankingMemberCategory>('todos');
  const [viewAllType, setViewAllType] = useState<MeetingType | null>(null);

  async function loadRanking(
    selectedGestao?: string,
    selectedCategory?: RankingMemberCategory
  ) {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const headers: HeadersInit = {};
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

      const params = new URLSearchParams();
      const gestaoValue = selectedGestao ?? gestao;
      const categoryValue = selectedCategory ?? memberCategory;
      if (gestaoValue) params.set('gestao', gestaoValue);
      if (categoryValue && categoryValue !== 'todos') params.set('categoria', categoryValue);
      const query = params.toString() ? `?${params.toString()}` : '';

      const [rankingRes, membersRes] = await Promise.all([
        fetch(`/api/roll-calls/ranking${query}`, { headers, credentials: 'include' }),
        fetch('/api/members', { credentials: 'include' }),
      ]);

      if (!rankingRes.ok) throw new Error('Erro ao carregar ranking');

      const json = await rankingRes.json() as RankingResponse;
      setData(json);
      setGestao(json.selectedGestao);
      setMemberCategory(json.selectedMemberCategory ?? categoryValue);

      if (membersRes.ok) {
        const members = await membersRes.json() as Member[];
        const map: Record<string, string> = {};
        for (const m of members) {
          if (m.photo) map[m.id] = m.photo;
        }
        setPhotoByMemberId(map);
      }
    } catch {
      setData(null);
      setPhotoByMemberId({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRanking();
  }, []);

  function photoFor(item: AttendanceRankingEntry): string | undefined {
    return item.photo || photoByMemberId[item.memberId];
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-slate-500">
        Carregando ranking de presenças...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center text-slate-500">
        Não foi possível carregar o ranking de presenças.
      </div>
    );
  }

  const categoryLabel = data.memberCategoryOptions.find((o) => o.value === memberCategory)?.label;
  const viewAllSection = viewAllType ? data.rankings[viewAllType] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-blue-800">Ranking de presenças</h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Top {PREVIEW_LIMIT} por tipo de reunião
            {memberCategory !== 'todos' && categoryLabel ? ` · ${categoryLabel}` : ''}
            {' '}na gestão {gestao}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="gestao-filter" className="text-sm text-slate-600">Gestão</label>
            <select
              id="gestao-filter"
              value={gestao}
              onChange={(e) => loadRanking(e.target.value, memberCategory)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              {data.gestaoOptions.length === 0 ? (
                <option value={data.selectedGestao}>{data.selectedGestao}</option>
              ) : (
                data.gestaoOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))
              )}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="categoria-filter" className="text-sm text-slate-600">Membros</label>
            <select
              id="categoria-filter"
              value={memberCategory}
              onChange={(e) => loadRanking(gestao, e.target.value as RankingMemberCategory)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              {data.memberCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        {TYPE_ORDER.map((type) => {
          const section = data.rankings[type];
          const preview = section.items.slice(0, PREVIEW_LIMIT);
          return (
            <div key={type} className="p-5 flex flex-col">
              <div className="mb-4">
                <h3 className="font-semibold text-slate-800">{section.label}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {section.totalMeetings === 0
                    ? 'Nenhuma reunião cadastrada nesta gestão.'
                    : `${section.totalMeetings} reunião(ões) cadastrada(s)`}
                </p>
              </div>
              {section.items.length === 0 ? (
                <p className="text-sm text-slate-400">Sem presenças registradas.</p>
              ) : (
                <>
                  <RankingList items={preview} photoFor={photoFor} />
                  <button
                    type="button"
                    onClick={() => setViewAllType(type)}
                    className="mt-4 w-full py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    Ver todos ({section.items.length})
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {viewAllType && viewAllSection && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={() => setViewAllType(null)}
        >
          <div
            className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl shadow-xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
              <div>
                <h3 className="text-lg font-bold text-blue-800">{viewAllSection.label}</h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  {viewAllSection.items.length} membro{viewAllSection.items.length === 1 ? '' : 's'} com frequência
                  {memberCategory !== 'todos' && categoryLabel ? ` · ${categoryLabel}` : ''}
                  {' '}· gestão {gestao}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewAllType(null)}
                className="text-slate-500 hover:text-slate-800 text-sm px-2 py-1"
              >
                Fechar
              </button>
            </div>
            <div className="px-5 py-4 overflow-y-auto">
              <RankingList items={viewAllSection.items} photoFor={photoFor} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
