import type { Member, MeetingType, AttendanceRankingEntry, MemberCategory } from '@/types';
import { normalizeGestaoKey } from '@/lib/gestao';
import type { RollCall } from '@/types';

export const MEETING_TYPES: MeetingType[] = ['ritualistica', 'administrativa', 'controle'];

export const MEETING_TYPE_LABELS: Record<MeetingType, string> = {
  ritualistica: 'Ritualísticas',
  administrativa: 'Administrativas',
  controle: 'Controle',
};

export const MEETING_TYPE_DESCRIPTIONS: Record<MeetingType, string> = {
  ritualistica: 'Reuniões ritualísticas com chamada geral do capítulo.',
  administrativa: 'Reuniões internas da diretoria, conselho consultivo, sêniores e convidados.',
  controle: 'Reuniões de controle interno do capítulo.',
};

export type RankingMemberCategory = 'todos' | 'demolays' | 'consultores' | 'seniores';

export const RANKING_MEMBER_CATEGORIES: RankingMemberCategory[] = [
  'todos',
  'demolays',
  'consultores',
  'seniores',
];

export const RANKING_MEMBER_CATEGORY_LABELS: Record<RankingMemberCategory, string> = {
  todos: 'Todos',
  demolays: 'DeMolays',
  consultores: 'Consultores',
  seniores: 'Sêniores',
};

const RANKING_MEMBER_CATEGORY_SET = new Set<string>(RANKING_MEMBER_CATEGORIES);

export function parseRankingMemberCategory(value: string | null): RankingMemberCategory {
  if (value && RANKING_MEMBER_CATEGORY_SET.has(value)) {
    return value as RankingMemberCategory;
  }
  return 'todos';
}

export function filterMembersByRankingCategory(
  members: Member[],
  category: RankingMemberCategory
): Member[] {
  if (category === 'todos') return members;
  return members.filter((m) => memberHasCategory(m, category as MemberCategory));
}

const DEMOLAY_DIRECTOR_ROLES = [
  'mestre conselheiro',
  '1º conselheiro',
  '1o conselheiro',
  'primeiro conselheiro',
  '2º conselheiro',
  '2o conselheiro',
  'segundo conselheiro',
  'escrivão',
  'escrivao',
  'hospitaleiro',
  'tesoureiro',
  'orador',
];

function normalizeRole(role: string): string {
  return role.trim().toLowerCase();
}

export function isDemolayDirectorRole(role: string): boolean {
  const r = normalizeRole(role);
  return DEMOLAY_DIRECTOR_ROLES.some((d) => r === d || r.includes(d.replace('º', '')));
}

export function memberHasCategory(m: Member, category: Member['category']): boolean {
  if (m.category === category) return true;
  return m.additionalRoles?.some((r) => r.category === category) ?? false;
}

export function isAdministrativaDefaultEligible(m: Member): boolean {
  if (memberHasCategory(m, 'consultores') || memberHasCategory(m, 'seniores')) return true;
  if (m.category === 'demolays' && isDemolayDirectorRole(m.role)) return true;
  return false;
}

export function getMembersForMeetingType(members: Member[], meetingType: MeetingType): Member[] {
  if (meetingType === 'administrativa') {
    return members.filter((m) => isAdministrativaDefaultEligible(m) || m.category === 'demolays');
  }
  return members;
}

export function getDefaultAttendancePool(members: Member[], meetingType: MeetingType): Member[] {
  if (meetingType === 'administrativa') {
    return members.filter((m) => isAdministrativaDefaultEligible(m));
  }
  return members;
}

export function computeAttendanceRanking(
  meetings: RollCall[],
  members: Member[],
  meetingType: MeetingType,
  gestaoKey: string,
  limit = 5,
  memberCategory: RankingMemberCategory = 'todos'
): AttendanceRankingEntry[] {
  const filtered = meetings.filter((meeting) => {
    const type = meeting.meetingType || 'ritualistica';
    if (type !== meetingType) return false;
    return normalizeGestaoKey(meeting.date, meeting.gestao) === gestaoKey;
  });

  const totalMeetings = filtered.length;
  if (totalMeetings === 0) return [];

  const eligibleIds = new Set(
    filterMembersByRankingCategory(members, memberCategory).map((m) => m.id)
  );

  const counts = new Map<string, number>();
  for (const meeting of filtered) {
    for (const [memberId, present] of Object.entries(meeting.attendance || {})) {
      if (!present) continue;
      if (memberCategory !== 'todos' && !eligibleIds.has(memberId)) continue;
      counts.set(memberId, (counts.get(memberId) || 0) + 1);
    }
  }

  const memberById = new Map(members.map((m) => [m.id, m]));

  return Array.from(counts.entries())
    .map(([memberId, count]) => ({
      memberId,
      name: memberById.get(memberId)?.name || 'Membro',
      photo: memberById.get(memberId)?.photo,
      count,
      percentage: Math.round((count / totalMeetings) * 100),
      totalMeetings,
    }))
    .sort((a, b) => b.count - a.count || b.percentage - a.percentage || a.name.localeCompare(b.name, 'pt-BR'))
    .slice(0, limit != null && limit > 0 ? limit : undefined);
}
