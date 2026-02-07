import { promises as fs } from 'fs';
import path from 'path';
import { mockMembers, mockNews } from '@/data/mock';
import type { Member, News, InternalMinutes, FinanceEntry, CalendarEvent, RollCall } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  await ensureDir();
  const filepath = path.join(DATA_DIR, file);
  try {
    const data = await fs.readFile(filepath, 'utf-8');
    return JSON.parse(data || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown) {
  await ensureDir();
  await fs.writeFile(
    path.join(DATA_DIR, file),
    JSON.stringify(data, null, 2),
    'utf-8'
  );
}

const MEMBERS_FILE = 'members.json';
const NEWS_FILE = 'news.json';
const MINUTES_FILE = 'minutes.json';
const ROLL_CALLS_FILE = 'roll-calls.json';
const FINANCE_FILE = 'finance.json';
const CALENDAR_FILE = 'calendar.json';

export async function getMembers(): Promise<Member[]> {
  return readJson<Member[]>(MEMBERS_FILE, mockMembers);
}

export async function saveMembers(members: Member[]) {
  await writeJson(MEMBERS_FILE, members);
}

export async function getNews(): Promise<News[]> {
  return readJson<News[]>(NEWS_FILE, mockNews);
}

export async function saveNews(news: News[]) {
  await writeJson(NEWS_FILE, news);
}

export async function getMinutes(): Promise<InternalMinutes[]> {
  return readJson<InternalMinutes[]>(MINUTES_FILE, []);
}

export async function saveMinutes(minutes: InternalMinutes[]) {
  await writeJson(MINUTES_FILE, minutes);
}

export function getNextAtaNumber(minutes: InternalMinutes[], year: number): number {
  const published = minutes.filter((m) => m.status === 'publicada' && m.ataYear === year);
  const maxNum = published.reduce((max, m) => Math.max(max, m.ataNumber ?? 0), 0);
  return maxNum + 1;
}

export async function getRollCalls(): Promise<RollCall[]> {
  return readJson<RollCall[]>(ROLL_CALLS_FILE, []);
}

export async function saveRollCalls(rollCalls: RollCall[]) {
  await writeJson(ROLL_CALLS_FILE, rollCalls);
}

export async function getFinanceEntries(): Promise<FinanceEntry[]> {
  return readJson<FinanceEntry[]>(FINANCE_FILE, []);
}

export async function saveFinanceEntries(entries: FinanceEntry[]) {
  await writeJson(FINANCE_FILE, entries);
}

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  return readJson<CalendarEvent[]>(CALENDAR_FILE, []);
}

export async function saveCalendarEvents(events: CalendarEvent[]) {
  await writeJson(CALENDAR_FILE, events);
}

export function generateId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
