import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** Data de fundação/instalação do capítulo: 19 de agosto (12 anos em 2026) */
const CHAPTER_ANNIVERSARY_MONTH = 8;
const CHAPTER_ANNIVERSARY_DAY = 19;
const CHAPTER_FOUNDED_YEAR = 2014;

/** Data do Colégio Alumni (sêniores): 26 de fevereiro (4 anos em 2026) */
const ALUMNI_ANNIVERSARY_MONTH = 2;
const ALUMNI_ANNIVERSARY_DAY = 26;
const ALUMNI_FOUNDED_YEAR = 2022;

export interface BirthdaysResponse {
  birthdays: { id: string; name: string }[];
  chapterAnniversary: boolean;
  chapterYears: number | null;
  alumniAnniversary: boolean;
  alumniYears: number | null;
}

export async function GET() {
  try {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const year = now.getFullYear();

    const supabase = createAdminClient();
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, name, birth_date')
      .not('birth_date', 'is', null);

    if (error) {
      console.error('[birthdays]', error);
      return NextResponse.json({
        birthdays: [],
        chapterAnniversary: false,
        chapterYears: null,
        alumniAnniversary: false,
        alumniYears: null,
      } satisfies BirthdaysResponse);
    }

    const birthdays = (profiles || [])
      .filter((p: { birth_date: string }) => {
        const dateStr = p.birth_date ? String(p.birth_date).slice(0, 10) : '';
        if (!dateStr) return false;
        const parts = dateStr.split('-').map(Number);
        return parts[1] === month && parts[2] === day;
      })
      .map((p: { id: string; name: string }) => ({
        id: p.id,
        name: p.name || 'Membro',
      }));

    const chapterAnniversary = month === CHAPTER_ANNIVERSARY_MONTH && day === CHAPTER_ANNIVERSARY_DAY;
    const alumniAnniversary = month === ALUMNI_ANNIVERSARY_MONTH && day === ALUMNI_ANNIVERSARY_DAY;

    const chapterYears = chapterAnniversary ? year - CHAPTER_FOUNDED_YEAR : null;
    const alumniYears = alumniAnniversary ? year - ALUMNI_FOUNDED_YEAR : null;

    return NextResponse.json({
      birthdays,
      chapterAnniversary,
      chapterYears,
      alumniAnniversary,
      alumniYears,
    } satisfies BirthdaysResponse);
  } catch (err) {
    console.error('[birthdays]', err);
    return NextResponse.json({
      birthdays: [],
      chapterAnniversary: false,
      chapterYears: null,
      alumniAnniversary: false,
      alumniYears: null,
    } satisfies BirthdaysResponse);
  }
}
