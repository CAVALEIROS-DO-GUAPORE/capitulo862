import { createAdminClient } from '@/lib/supabase/admin';
import type { Member, News, InternalMinutes, FinanceEntry, CalendarEvent, RollCall, MembershipCandidate, MemberAdditionalRole } from '@/types';

function parseAdditionalRoles(raw: unknown): MemberAdditionalRole[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is Record<string, unknown> => x != null && typeof x === 'object' && 'category' in x && 'role' in x)
    .map((x) => ({ category: String(x.category) as Member['category'], role: String(x.role) }));
}

function toMember(row: Record<string, unknown>): Member {
  const rawId = row.identifier ?? row.numero_id;
  const identifier = rawId != null && rawId !== '' ? Number(rawId) : 0;
  return {
    id: String(row.id),
    name: String(row.name),
    photo: row.photo ? String(row.photo) : undefined,
    role: String(row.role),
    category: String(row.category) as Member['category'],
    order: Number(row.order ?? 0),
    userId: row.user_id ? String(row.user_id) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    identifier: Number.isNaN(identifier) ? 0 : identifier,
    additionalRoles: parseAdditionalRoles(row.additional_roles),
  };
}

function toNews(row: Record<string, unknown>): News {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    image: row.image ? String(row.image) : undefined,
    instagramUrl: row.instagram_url ? String(row.instagram_url) : undefined,
    images: Array.isArray(row.images) ? row.images as string[] : [],
    createdAt: String(row.created_at ?? ''),
    authorId: row.author_id ? String(row.author_id) : undefined,
  };
}

function toMinute(row: Record<string, unknown>): InternalMinutes {
  return {
    id: String(row.id),
    title: String(row.title),
    content: String(row.content),
    createdAt: String(row.created_at ?? ''),
    authorId: row.author_id ? String(row.author_id) : 'system',
    status: row.status ? (row.status as 'rascunho' | 'publicada') : undefined,
    ataNumber: row.ata_number != null ? Number(row.ata_number) : undefined,
    ataYear: row.ata_year != null ? Number(row.ata_year) : undefined,
    date: row.date ? String(row.date).slice(0, 10) : undefined,
    startTime: row.start_time ? String(row.start_time) : undefined,
    endTime: row.end_time ? String(row.end_time) : undefined,
    type: row.type as InternalMinutes['type'] | undefined,
    ourLodge: row.our_lodge !== false,
    locationName: row.location_name ? String(row.location_name) : undefined,
    city: row.city ? String(row.city) : undefined,
    rollCallId: row.roll_call_id ? String(row.roll_call_id) : undefined,
    rollCallDate: row.roll_call_date ? String(row.roll_call_date).slice(0, 10) : undefined,
    presidingMc: row.presiding_mc ? String(row.presiding_mc) : undefined,
    presiding1c: row.presiding_1c ? String(row.presiding_1c) : undefined,
    presiding2c: row.presiding_2c ? String(row.presiding_2c) : undefined,
    tiosPresentes: Array.isArray(row.tios_presentes) ? row.tios_presentes as string[] : undefined,
    trabalhosTexto: row.trabalhos_texto ? String(row.trabalhos_texto) : undefined,
    escrivaoName: row.escrivao_name ? String(row.escrivao_name) : undefined,
    ataGestao: row.ata_gestao ? String(row.ata_gestao) : undefined,
    tioConselho: row.tio_conselho ? String(row.tio_conselho) : undefined,
    palavraSecreta: row.palavra_secreta ? String(row.palavra_secreta) : undefined,
    pauta: row.pauta ? String(row.pauta) : undefined,
  };
}

function toCalendarEvent(row: Record<string, unknown>): CalendarEvent {
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description ? String(row.description) : undefined,
    date: String(row.date).slice(0, 10),
    type: (row.type as CalendarEvent['type']) || 'outro',
    category: (row.category as CalendarEvent['category']) || 'evento',
    startTime: row.start_time ? String(row.start_time) : undefined,
    dateEnd: row.date_end ? String(row.date_end).slice(0, 10) : undefined,
    enviado: row.enviado === true,
  };
}

function toFinanceEntry(row: Record<string, unknown>): FinanceEntry {
  return {
    id: String(row.id),
    type: row.type as 'entrada' | 'saida',
    amount: Number(row.amount),
    description: String(row.description ?? ''),
    date: String(row.date).slice(0, 10),
    createdAt: String(row.created_at ?? ''),
  };
}

function toRollCall(row: Record<string, unknown>): RollCall {
  return {
    id: String(row.id),
    date: String(row.date).slice(0, 10),
    attendance: (row.attendance as Record<string, boolean>) || {},
    createdAt: String(row.created_at ?? ''),
    authorId: row.author_id ? String(row.author_id) : 'system',
    gestao: row.gestao != null ? String(row.gestao) : undefined,
    tipoReuniao: row.tipo_reuniao != null ? String(row.tipo_reuniao) : undefined,
    breveDescricao: row.breve_descricao != null ? String(row.breve_descricao) : undefined,
  };
}

function toCandidate(row: Record<string, unknown>): MembershipCandidate {
  return {
    id: String(row.id),
    fullName: String(row.full_name),
    motherName: String(row.mother_name),
    fatherName: row.father_name ? String(row.father_name) : undefined,
    birthDate: String(row.birth_date).slice(0, 10),
    city: String(row.city),
    fatherIsMason: Boolean(row.father_is_mason),
    phone: String(row.phone),
    email: String(row.email),
    knowsDemolay: Boolean(row.knows_demolay),
    demolayContactName: row.demolay_contact_name ? String(row.demolay_contact_name) : undefined,
    interestReason: String(row.interest_reason),
    createdAt: String(row.created_at ?? ''),
    readByMc: Boolean(row.read_by_mc),
    readByFirstCounselor: Boolean(row.read_by_first_counselor),
  };
}

// ---------- Members ----------
export async function getMembers(): Promise<Member[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('members').select('*').order('order', { ascending: true });
  if (error) throw error;
  return (data || []).map(toMember);
}

export async function insertMember(m: Omit<Member, 'id'>): Promise<Member> {
  const supabase = createAdminClient();
  const row = {
    name: m.name,
    photo: m.photo ?? null,
    role: m.role,
    category: m.category,
    order: m.order,
    user_id: m.userId ?? null,
    phone: m.phone ?? null,
    identifier: m.identifier != null ? m.identifier : 0,
    additional_roles: Array.isArray(m.additionalRoles) ? m.additionalRoles : [],
  };
  const { data, error } = await supabase.from('members').insert(row).select('*').single();
  if (error) throw error;
  return toMember(data);
}

export async function updateMember(id: string, partial: Partial<Member>): Promise<Member> {
  const supabase = createAdminClient();
  const row: Record<string, unknown> = {};
  if (partial.name !== undefined) row.name = partial.name;
  if (partial.photo !== undefined) row.photo = partial.photo;
  if (partial.role !== undefined) row.role = partial.role;
  if (partial.category !== undefined) row.category = partial.category;
  if (partial.order !== undefined) row.order = partial.order;
  if (partial.userId !== undefined) row.user_id = partial.userId;
  if (partial.phone !== undefined) row.phone = partial.phone;
  if (partial.identifier !== undefined) row.identifier = partial.identifier;
  if (partial.additionalRoles !== undefined) row.additional_roles = partial.additionalRoles;
  const { data, error } = await supabase.from('members').update(row).eq('id', id).select('*').single();
  if (error) throw error;
  return toMember(data);
}

export async function deleteMember(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('members').delete().eq('id', id);
  if (error) throw error;
}

// ---------- News ----------
export async function getNews(): Promise<News[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('news').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toNews);
}

export async function insertNews(n: Omit<News, 'id'>): Promise<News> {
  const supabase = createAdminClient();
  const row = {
    title: n.title,
    description: n.description,
    image: n.image ?? null,
    instagram_url: n.instagramUrl ?? null,
    images: n.images ?? [],
    author_id: n.authorId ?? null,
  };
  const { data, error } = await supabase.from('news').insert(row).select('*').single();
  if (error) throw error;
  return toNews(data);
}

export async function updateNews(id: string, partial: Partial<News>): Promise<News> {
  const supabase = createAdminClient();
  const row: Record<string, unknown> = {};
  if (partial.title !== undefined) row.title = partial.title;
  if (partial.description !== undefined) row.description = partial.description;
  if (partial.image !== undefined) row.image = partial.image;
  if (partial.instagramUrl !== undefined) row.instagram_url = partial.instagramUrl;
  if (partial.images !== undefined) row.images = partial.images;
  const { data, error } = await supabase.from('news').update(row).eq('id', id).select('*').single();
  if (error) throw error;
  return toNews(data);
}

export async function deleteNews(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('news').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Minutes ----------
export async function getMinutes(): Promise<InternalMinutes[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('minutes').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toMinute);
}

export async function getNextAtaNumber(year: number): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('minutes')
    .select('ata_number')
    .eq('status', 'publicada')
    .eq('ata_year', year);
  if (error) throw error;
  const maxNum = (data || []).reduce((max, r) => Math.max(max, Number(r.ata_number ?? 0)), 0);
  return maxNum + 1;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function toAuthorIdNullable(value: string | undefined): string | null {
  if (value == null || value === '' || value === 'system') return null;
  return UUID_REGEX.test(value) ? value : null;
}

export async function insertMinute(m: Omit<InternalMinutes, 'id'>): Promise<InternalMinutes> {
  const supabase = createAdminClient();
  const row = {
    title: m.title,
    content: m.content,
    author_id: toAuthorIdNullable(m.authorId),
    status: m.status ?? 'rascunho',
    ata_number: m.ataNumber ?? null,
    ata_year: m.ataYear ?? null,
    date: m.date ?? null,
    start_time: m.startTime ?? null,
    end_time: m.endTime ?? null,
    type: m.type ?? null,
    our_lodge: m.ourLodge ?? true,
    location_name: m.locationName ?? null,
    city: m.city ?? null,
    roll_call_id: m.rollCallId ?? null,
    roll_call_date: m.rollCallDate ?? null,
    presiding_mc: m.presidingMc ?? null,
    presiding_1c: m.presiding1c ?? null,
    presiding_2c: m.presiding2c ?? null,
    tios_presentes: m.tiosPresentes ?? [],
    trabalhos_texto: m.trabalhosTexto ?? null,
    escrivao_name: m.escrivaoName ?? null,
    ata_gestao: m.ataGestao ?? null,
    tio_conselho: m.tioConselho ?? null,
    palavra_secreta: m.palavraSecreta ?? null,
    pauta: m.pauta ?? null,
  };
  const { data, error } = await supabase.from('minutes').insert(row).select('*').single();
  if (error) throw error;
  return toMinute(data);
}

export async function updateMinute(id: string, partial: Partial<InternalMinutes>): Promise<InternalMinutes> {
  const supabase = createAdminClient();
  const row: Record<string, unknown> = {};
  if (partial.title !== undefined) row.title = partial.title;
  if (partial.content !== undefined) row.content = partial.content;
  if (partial.status !== undefined) row.status = partial.status;
  if (partial.ataNumber !== undefined) row.ata_number = partial.ataNumber;
  if (partial.ataYear !== undefined) row.ata_year = partial.ataYear;
  if (partial.date !== undefined) row.date = partial.date;
  if (partial.startTime !== undefined) row.start_time = partial.startTime;
  if (partial.endTime !== undefined) row.end_time = partial.endTime;
  if (partial.type !== undefined) row.type = partial.type;
  if (partial.ourLodge !== undefined) row.our_lodge = partial.ourLodge;
  if (partial.locationName !== undefined) row.location_name = partial.locationName;
  if (partial.city !== undefined) row.city = partial.city;
  if (partial.rollCallId !== undefined) row.roll_call_id = partial.rollCallId;
  if (partial.rollCallDate !== undefined) row.roll_call_date = partial.rollCallDate;
  if (partial.presidingMc !== undefined) row.presiding_mc = partial.presidingMc;
  if (partial.presiding1c !== undefined) row.presiding_1c = partial.presiding1c;
  if (partial.presiding2c !== undefined) row.presiding_2c = partial.presiding2c;
  if (partial.tiosPresentes !== undefined) row.tios_presentes = partial.tiosPresentes;
  if (partial.trabalhosTexto !== undefined) row.trabalhos_texto = partial.trabalhosTexto;
  if (partial.escrivaoName !== undefined) row.escrivao_name = partial.escrivaoName;
  if (partial.ataGestao !== undefined) row.ata_gestao = partial.ataGestao;
  if (partial.tioConselho !== undefined) row.tio_conselho = partial.tioConselho;
  if (partial.palavraSecreta !== undefined) row.palavra_secreta = partial.palavraSecreta;
  if (partial.pauta !== undefined) row.pauta = partial.pauta;
  const { data, error } = await supabase.from('minutes').update(row).eq('id', id).select('*').single();
  if (error) throw error;
  return toMinute(data);
}

export async function deleteMinute(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('minutes').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Calendar ----------
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('calendar_events').select('*').order('date', { ascending: true });
  if (error) throw error;
  return (data || []).map(toCalendarEvent);
}

export async function insertCalendarEvent(e: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
  const supabase = createAdminClient();
  const row: Record<string, unknown> = {
    title: e.title,
    description: e.description ?? null,
    date: e.date,
    type: e.type ?? 'outro',
    category: e.category ?? 'evento',
    start_time: e.startTime ?? null,
    date_end: e.dateEnd ?? null,
    enviado: e.enviado ?? false,
  };
  const { data, error } = await supabase.from('calendar_events').insert(row).select('*').single();
  if (error) throw error;
  return toCalendarEvent(data);
}

export async function updateCalendarEvent(id: string, partial: Partial<CalendarEvent>): Promise<CalendarEvent> {
  const supabase = createAdminClient();
  const row: Record<string, unknown> = {};
  if (partial.title !== undefined) row.title = partial.title;
  if (partial.description !== undefined) row.description = partial.description;
  if (partial.date !== undefined) row.date = partial.date;
  if (partial.type !== undefined) row.type = partial.type;
  if (partial.category !== undefined) row.category = partial.category;
  if (partial.startTime !== undefined) row.start_time = partial.startTime;
  if (partial.dateEnd !== undefined) row.date_end = partial.dateEnd;
  if (partial.enviado !== undefined) row.enviado = partial.enviado;
  const { data, error } = await supabase.from('calendar_events').update(row).eq('id', id).select('*').single();
  if (error) throw error;
  return toCalendarEvent(data);
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('calendar_events').delete().eq('id', id);
  if (error) throw error;
}

/** Próximo evento (category = evento, date >= hoje), ordenado por data e start_time */
export async function getNextCalendarEvent(): Promise<CalendarEvent | null> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('category', 'evento')
    .gte('date', today)
    .order('date', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toCalendarEvent(data) : null;
}

/** Atividades mensais não enviadas com date_end >= hoje (para alertas de rank) */
export async function getUpcomingCalendarActivities(): Promise<CalendarEvent[]> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('category', 'atividades_mensais')
    .eq('enviado', false)
    .gte('date_end', today)
    .order('date_end', { ascending: true });
  if (error) throw error;
  return (data || []).map(toCalendarEvent);
}

// ---------- Finance ----------
export interface GetFinanceEntriesOptions {
  ano?: number;
  mes?: number;
  data?: string; // YYYY-MM-DD exato
}

export async function getFinanceEntries(opts?: GetFinanceEntriesOptions): Promise<FinanceEntry[]> {
  const supabase = createAdminClient();
  let query = supabase.from('finance_entries').select('*');
  if (opts?.data) {
    query = query.eq('date', opts.data);
  } else if (opts?.ano != null) {
    const start = `${opts.ano}-01-01`;
    const end = `${opts.ano}-12-31`;
    if (opts.mes != null) {
      const m = String(opts.mes).padStart(2, '0');
      const lastDay = new Date(opts.ano, opts.mes, 0).getDate();
      const endMonth = `${opts.ano}-${m}-${String(lastDay).padStart(2, '0')}`;
      query = query.gte('date', `${opts.ano}-${m}-01`).lte('date', endMonth);
    } else {
      query = query.gte('date', start).lte('date', end);
    }
  }
  const { data, error } = await query.order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(toFinanceEntry);
}

export async function insertFinanceEntry(e: Omit<FinanceEntry, 'id'>): Promise<FinanceEntry> {
  const supabase = createAdminClient();
  const row = { type: e.type, amount: e.amount, description: e.description ?? '', date: e.date };
  const { data, error } = await supabase.from('finance_entries').insert(row).select('*').single();
  if (error) throw error;
  return toFinanceEntry(data);
}

export async function updateFinanceEntry(id: string, partial: Partial<FinanceEntry>): Promise<FinanceEntry> {
  const supabase = createAdminClient();
  const row: Record<string, unknown> = {};
  if (partial.type !== undefined) row.type = partial.type;
  if (partial.amount !== undefined) row.amount = partial.amount;
  if (partial.description !== undefined) row.description = partial.description;
  if (partial.date !== undefined) row.date = partial.date;
  const { data, error } = await supabase.from('finance_entries').update(row).eq('id', id).select('*').single();
  if (error) throw error;
  return toFinanceEntry(data);
}

export async function deleteFinanceEntry(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('finance_entries').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Roll calls ----------
export async function getRollCalls(): Promise<RollCall[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('roll_calls').select('*').order('date', { ascending: false });
  if (error) throw error;
  return (data || []).map(toRollCall);
}

export async function getRollCallByDate(date: string): Promise<RollCall | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('roll_calls').select('*').eq('date', date).maybeSingle();
  if (error) throw error;
  return data ? toRollCall(data) : null;
}

export interface UpsertRollCallOptions {
  date: string;
  attendance: Record<string, boolean>;
  gestao?: string;
  tipoReuniao?: string;
  breveDescricao?: string;
}

export async function upsertRollCall(
  dateOrOptions: string | UpsertRollCallOptions,
  attendance?: Record<string, boolean>
): Promise<RollCall> {
  const supabase = createAdminClient();
  const opts = typeof dateOrOptions === 'string'
    ? { date: dateOrOptions, attendance: attendance ?? {} }
    : dateOrOptions;
  const { date, attendance: att, gestao, tipoReuniao, breveDescricao } = opts;
  const existing = await getRollCallByDate(date);
  const row: Record<string, unknown> = {
    date,
    attendance: att ?? {},
    author_id: null,
    gestao: gestao ?? null,
    tipo_reuniao: tipoReuniao ?? null,
    breve_descricao: breveDescricao ?? null,
  };
  if (existing) {
    const { data, error } = await supabase.from('roll_calls').update(row).eq('id', existing.id).select('*').single();
    if (error) throw error;
    return toRollCall(data);
  }
  const { data, error } = await supabase.from('roll_calls').insert(row).select('*').single();
  if (error) throw error;
  return toRollCall(data);
}

/** Roll calls filtrados por ano e gestão (para relatório único). */
export async function getRollCallsByYearAndGestao(year: number, gestao: string): Promise<RollCall[]> {
  const supabase = createAdminClient();
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  const { data, error } = await supabase
    .from('roll_calls')
    .select('*')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true });
  if (error) throw error;
  const list = (data || []).map(toRollCall);
  const gestaoNorm = String(gestao || '').trim();
  if (!gestaoNorm) return list;
  return list.filter((rc) => String(rc.gestao || '').trim() === gestaoNorm);
}

// ---------- Candidatos ----------
export async function getCandidates(): Promise<MembershipCandidate[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('membership_candidates').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(toCandidate);
}

export async function insertCandidate(c: Omit<MembershipCandidate, 'id'>): Promise<MembershipCandidate> {
  const supabase = createAdminClient();
  const row = {
    full_name: c.fullName,
    mother_name: c.motherName,
    father_name: c.fatherName ?? null,
    birth_date: c.birthDate,
    city: c.city,
    father_is_mason: c.fatherIsMason,
    phone: c.phone,
    email: c.email,
    knows_demolay: c.knowsDemolay,
    demolay_contact_name: c.demolayContactName ?? null,
    interest_reason: c.interestReason,
    read_by_mc: c.readByMc ?? false,
    read_by_first_counselor: c.readByFirstCounselor ?? false,
  };
  const { data, error } = await supabase.from('membership_candidates').insert(row).select('*').single();
  if (error) throw error;
  return toCandidate(data);
}

export async function updateCandidate(id: string, partial: Partial<MembershipCandidate>): Promise<MembershipCandidate> {
  const supabase = createAdminClient();
  const row: Record<string, unknown> = {};
  if (partial.fullName !== undefined) row.full_name = partial.fullName;
  if (partial.motherName !== undefined) row.mother_name = partial.motherName;
  if (partial.fatherName !== undefined) row.father_name = partial.fatherName;
  if (partial.birthDate !== undefined) row.birth_date = partial.birthDate;
  if (partial.city !== undefined) row.city = partial.city;
  if (partial.fatherIsMason !== undefined) row.father_is_mason = partial.fatherIsMason;
  if (partial.phone !== undefined) row.phone = partial.phone;
  if (partial.email !== undefined) row.email = partial.email;
  if (partial.knowsDemolay !== undefined) row.knows_demolay = partial.knowsDemolay;
  if (partial.demolayContactName !== undefined) row.demolay_contact_name = partial.demolayContactName;
  if (partial.interestReason !== undefined) row.interest_reason = partial.interestReason;
  if (partial.readByMc !== undefined) row.read_by_mc = partial.readByMc;
  if (partial.readByFirstCounselor !== undefined) row.read_by_first_counselor = partial.readByFirstCounselor;
  const { data, error } = await supabase.from('membership_candidates').update(row).eq('id', id).select('*').single();
  if (error) throw error;
  return toCandidate(data);
}

export async function deleteCandidate(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('membership_candidates').delete().eq('id', id);
  if (error) throw error;
}
