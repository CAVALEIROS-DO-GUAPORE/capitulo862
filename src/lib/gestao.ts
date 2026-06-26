export type GestaoKey = `${number}/${1 | 2}`;

export function gestaoFromDate(dateStr: string): GestaoKey {
  const d = new Date(`${dateStr.slice(0, 10)}T12:00:00`);
  const year = d.getFullYear();
  const period = d.getMonth() + 1 <= 6 ? 1 : 2;
  return `${year}/${period}` as GestaoKey;
}

export function parseGestaoKey(key: string): { year: number; period: 1 | 2 } | null {
  const match = String(key).trim().match(/^(\d{4})\/([12])$/);
  if (!match) return null;
  return { year: parseInt(match[1], 10), period: parseInt(match[2], 10) as 1 | 2 };
}

export function compareGestao(a: string, b: string): number {
  const pa = parseGestaoKey(a);
  const pb = parseGestaoKey(b);
  if (!pa && !pb) return 0;
  if (!pa) return -1;
  if (!pb) return 1;
  if (pa.year !== pb.year) return pa.year - pb.year;
  return pa.period - pb.period;
}

/** Normaliza gestão legada ("1"/"2") para formato ano/período. */
export function normalizeGestaoKey(dateStr: string, gestao?: string | null): GestaoKey {
  const trimmed = String(gestao || '').trim();
  if (parseGestaoKey(trimmed)) return trimmed as GestaoKey;
  const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) : new Date().getFullYear();
  const period = trimmed === '2' ? 2 : trimmed === '1' ? 1 : gestaoFromDate(dateStr).endsWith('/2') ? 2 : 1;
  if (trimmed === '1' || trimmed === '2') {
    return `${year}/${period}` as GestaoKey;
  }
  return gestaoFromDate(dateStr);
}

export function formatGestaoLabel(key: string): string {
  const parsed = parseGestaoKey(key);
  if (!parsed) return key;
  return `${parsed.year}/${parsed.period}`;
}

export function getCurrentGestaoFromToday(): GestaoKey {
  return gestaoFromDate(new Date().toISOString().slice(0, 10));
}

export function resolveActiveGestao(meetings: { date: string; gestao?: string | null }[]): GestaoKey {
  let active = getCurrentGestaoFromToday();
  for (const meeting of meetings) {
    const key = normalizeGestaoKey(meeting.date, meeting.gestao);
    if (compareGestao(key, active) > 0) active = key;
  }
  return active;
}

export function listGestaoKeysFromMeetings(meetings: { date: string; gestao?: string | null }[]): GestaoKey[] {
  const set = new Set<GestaoKey>([getCurrentGestaoFromToday()]);
  for (const meeting of meetings) {
    set.add(normalizeGestaoKey(meeting.date, meeting.gestao));
  }
  return Array.from(set).sort(compareGestao).reverse();
}
