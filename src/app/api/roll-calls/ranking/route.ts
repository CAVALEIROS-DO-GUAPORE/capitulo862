import { NextResponse, type NextRequest } from 'next/server';
import { getMembers, getRollCalls } from '@/lib/data';
import { requirePanelUser } from '@/lib/panel-auth';
import { enrichMembersWithPhotos } from '@/lib/member-photos';
import {
  computeAttendanceRanking,
  MEETING_TYPES,
  MEETING_TYPE_LABELS,
  parseRankingMemberCategory,
  RANKING_MEMBER_CATEGORIES,
  RANKING_MEMBER_CATEGORY_LABELS,
} from '@/lib/meeting-attendance';
import {
  formatGestaoLabel,
  listGestaoKeysFromMeetings,
  normalizeGestaoKey,
  resolveActiveGestao,
} from '@/lib/gestao';
import type { MeetingType } from '@/types';

export async function GET(request: NextRequest) {
  const auth = await requirePanelUser(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const gestaoParam = searchParams.get('gestao');
    const memberCategory = parseRankingMemberCategory(searchParams.get('categoria'));

    const [meetings, membersRaw] = await Promise.all([getRollCalls(), getMembers()]);
    const members = await enrichMembersWithPhotos(membersRaw);
    const gestaoOptions = listGestaoKeysFromMeetings(meetings).map((key) => ({
      value: key,
      label: formatGestaoLabel(key),
    }));
    const activeGestao = resolveActiveGestao(meetings);
    const selectedGestao = gestaoParam && gestaoOptions.some((g) => g.value === gestaoParam)
      ? gestaoParam
      : activeGestao;

    const rankings = Object.fromEntries(
      MEETING_TYPES.map((type) => [
        type,
        {
          label: MEETING_TYPE_LABELS[type],
          items: computeAttendanceRanking(meetings, members, type, selectedGestao, 0, memberCategory),
          totalMeetings: meetings.filter((meeting) => {
            const meetingType = meeting.meetingType || 'ritualistica';
            return meetingType === type && normalizeGestaoKey(meeting.date, meeting.gestao) === selectedGestao;
          }).length,
        },
      ])
    ) as Record<MeetingType, { label: string; items: ReturnType<typeof computeAttendanceRanking>; totalMeetings: number }>;

    return NextResponse.json({
      activeGestao,
      selectedGestao,
      selectedMemberCategory: memberCategory,
      memberCategoryOptions: RANKING_MEMBER_CATEGORIES.map((value) => ({
        value,
        label: RANKING_MEMBER_CATEGORY_LABELS[value],
      })),
      gestaoOptions,
      rankings,
    });
  } catch (err) {
    console.error('[GET /api/roll-calls/ranking]', err);
    return NextResponse.json({ error: 'Erro ao carregar ranking' }, { status: 500 });
  }
}
