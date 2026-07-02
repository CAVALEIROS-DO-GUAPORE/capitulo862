import { createAdminClient } from '@/lib/supabase/admin';
import { parseMemberBadges } from '@/lib/member-badges';
import { sanitizePublicRaffle } from '@/lib/raffles-security';
import type { Member, News, InternalMinutes, FinanceEntry, FinanceReceipt, CalendarEvent, RollCall, MembershipCandidate, MemberAdditionalRole, CandidateDocument, MeetingType, Raffle, RaffleSale, RaffleSoldNumber, PublicRaffle, RaffleStatus, RaffleSoldReportRow } from '@/types';

export const FINANCE_RECEIPTS_BUCKET = 'finance-receipts';
export const CANDIDATE_DOCUMENTS_BUCKET = 'candidate-documents';
export const RAFFLE_RECEIPTS_BUCKET = 'raffle-receipts';
export const RAFFLE_IMAGES_BUCKET = 'raffle-images';

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
    badges: parseMemberBadges(row.badges),
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
    authorName: row.author_name ? String(row.author_name) : undefined,
    authorRole: row.author_role ? String(row.author_role) : undefined,
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
  const receipts = row.finance_receipts as { count?: number }[] | undefined;
  const receiptCount = receipts?.[0]?.count ?? 0;
  return {
    id: String(row.id),
    type: row.type as 'entrada' | 'saida',
    amount: Number(row.amount),
    description: String(row.description ?? ''),
    date: String(row.date).slice(0, 10),
    createdAt: String(row.created_at ?? ''),
    receiptCount: Number(receiptCount) || 0,
  };
}

function toFinanceReceipt(row: Record<string, unknown>): FinanceReceipt {
  return {
    id: String(row.id),
    financeEntryId: String(row.finance_entry_id),
    fileName: String(row.file_name),
    mimeType: String(row.mime_type),
    fileSize: Number(row.file_size ?? 0),
    createdAt: String(row.created_at ?? ''),
    storagePath: String(row.storage_path),
  };
}

function toRollCall(row: Record<string, unknown>): RollCall {
  const meetingType = row.meeting_type ? String(row.meeting_type) as RollCall['meetingType'] : 'ritualistica';
  return {
    id: String(row.id),
    date: String(row.date).slice(0, 10),
    attendance: (row.attendance as Record<string, boolean>) || {},
    createdAt: String(row.created_at ?? ''),
    authorId: row.author_id ? String(row.author_id) : 'system',
    gestao: row.gestao != null ? String(row.gestao) : undefined,
    tipoReuniao: row.tipo_reuniao != null ? String(row.tipo_reuniao) : undefined,
    breveDescricao: row.breve_descricao != null ? String(row.breve_descricao) : undefined,
    meetingType,
    title: row.title ? String(row.title) : undefined,
    description: row.description ? String(row.description) : (row.breve_descricao ? String(row.breve_descricao) : undefined),
    startTime: row.start_time ? String(row.start_time) : undefined,
    endTime: row.end_time ? String(row.end_time) : undefined,
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
    sindicanciaResumo: row.sindicancia_resumo ? String(row.sindicancia_resumo) : undefined,
  };
}

function toCandidateDocument(row: Record<string, unknown>): CandidateDocument {
  return {
    id: String(row.id),
    candidateId: String(row.candidate_id),
    docType: String(row.doc_type),
    fileName: String(row.file_name),
    mimeType: String(row.mime_type),
    fileSize: Number(row.file_size ?? 0),
    createdAt: String(row.created_at ?? ''),
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
    badges: Array.isArray(m.badges) ? m.badges : [],
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
  if (partial.badges !== undefined) row.badges = partial.badges;
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
    author_name: n.authorName ?? null,
    author_role: n.authorRole ?? null,
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
  if (partial.authorName !== undefined) row.author_name = partial.authorName;
  if (partial.authorRole !== undefined) row.author_role = partial.authorRole;
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

  // Tipagem do query builder do supabase-js pode ficar "profunda" demais aqui.
  // Mantemos como `any` para evitar erro de compilação (Type instantiation excessively deep).
  function applyFilters(query: any): any {
    if (opts?.data) {
      return query.eq('date', opts.data);
    }
    if (opts?.ano != null) {
      if (opts.mes != null) {
        const m = String(opts.mes).padStart(2, '0');
        const lastDay = new Date(opts.ano, opts.mes, 0).getDate();
        const endMonth = `${opts.ano}-${m}-${String(lastDay).padStart(2, '0')}`;
        return query.gte('date', `${opts.ano}-${m}-01`).lte('date', endMonth);
      }
      return query.gte('date', `${opts.ano}-01-01`).lte('date', `${opts.ano}-12-31`);
    }
    return query;
  }

  let query = applyFilters(supabase.from('finance_entries').select('*, finance_receipts(count)'));
  let { data, error } = await query.order('date', { ascending: false });

  if (error) {
    const fallback = applyFilters(supabase.from('finance_entries').select('*'));
    const retry = await fallback.order('date', { ascending: false });
    data = retry.data;
    error = retry.error;
  }

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
  await deleteFinanceReceiptsForEntry(id);
  const { error } = await supabase.from('finance_entries').delete().eq('id', id);
  if (error) throw error;
}

export async function getFinanceReceipts(entryId: string): Promise<FinanceReceipt[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('finance_receipts')
    .select('*')
    .eq('finance_entry_id', entryId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(toFinanceReceipt);
}

export async function insertFinanceReceipt(row: {
  financeEntryId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}): Promise<FinanceReceipt> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('finance_receipts')
    .insert({
      finance_entry_id: row.financeEntryId,
      storage_path: row.storagePath,
      file_name: row.fileName,
      mime_type: row.mimeType,
      file_size: row.fileSize,
    })
    .select('*')
    .single();
  if (error) throw error;
  return toFinanceReceipt(data);
}

export async function deleteFinanceReceipt(receiptId: string): Promise<FinanceReceipt | null> {
  const supabase = createAdminClient();
  const { data: existing, error: fetchError } = await supabase
    .from('finance_receipts')
    .select('*')
    .eq('id', receiptId)
    .maybeSingle();
  if (fetchError) throw fetchError;
  if (!existing) return null;

  const { error } = await supabase.from('finance_receipts').delete().eq('id', receiptId);
  if (error) throw error;

  try {
    await supabase.storage.from(FINANCE_RECEIPTS_BUCKET).remove([String(existing.storage_path)]);
  } catch {
    // ignora falha ao remover arquivo
  }

  return toFinanceReceipt(existing);
}

export async function deleteFinanceReceiptsForEntry(entryId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: receipts, error } = await supabase
    .from('finance_receipts')
    .select('storage_path')
    .eq('finance_entry_id', entryId);
  if (error) throw error;

  if (receipts?.length) {
    const paths = receipts.map((r) => String(r.storage_path)).filter(Boolean);
    if (paths.length) {
      try {
        await supabase.storage.from(FINANCE_RECEIPTS_BUCKET).remove(paths);
      } catch {
        // ignora falha ao remover arquivos
      }
    }
  }

  await supabase.from('finance_receipts').delete().eq('finance_entry_id', entryId);
}

export async function downloadFinanceReceiptFile(storagePath: string): Promise<{ buffer: Buffer; contentType: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(FINANCE_RECEIPTS_BUCKET).download(storagePath);
  if (error || !data) throw error ?? new Error('Arquivo não encontrado');
  const buffer = Buffer.from(await data.arrayBuffer());
  return { buffer, contentType: data.type || 'application/octet-stream' };
}

// ---------- Roll calls ----------
export async function getRollCalls(meetingType?: MeetingType): Promise<RollCall[]> {
  const supabase = createAdminClient();
  let query = supabase.from('roll_calls').select('*').order('date', { ascending: false });
  if (meetingType === 'ritualistica') {
    query = query.or('meeting_type.eq.ritualistica,meeting_type.is.null');
  } else if (meetingType) {
    query = query.eq('meeting_type', meetingType);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(toRollCall);
}

export async function getRollCallById(id: string): Promise<RollCall | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('roll_calls').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toRollCall(data) : null;
}

export async function getRollCallByDate(date: string): Promise<RollCall | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('roll_calls')
    .select('*')
    .eq('date', date)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = data || [];
  const ritualistica = rows.find((row) => !row.meeting_type || row.meeting_type === 'ritualistica');
  if (ritualistica) return toRollCall(ritualistica);
  return rows[0] ? toRollCall(rows[0]) : null;
}

export interface UpsertRollCallOptions {
  id?: string;
  date: string;
  attendance: Record<string, boolean>;
  gestao?: string;
  tipoReuniao?: string;
  breveDescricao?: string;
  meetingType?: MeetingType;
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  authorId?: string;
}

function buildRollCallRow(opts: UpsertRollCallOptions): Record<string, unknown> {
  return {
    date: opts.date,
    attendance: opts.attendance ?? {},
    author_id: opts.authorId ?? null,
    gestao: opts.gestao ?? null,
    tipo_reuniao: opts.tipoReuniao ?? null,
    breve_descricao: opts.breveDescricao ?? opts.description ?? null,
    meeting_type: opts.meetingType ?? 'ritualistica',
    title: opts.title ?? null,
    description: opts.description ?? opts.breveDescricao ?? null,
    start_time: opts.startTime ?? null,
    end_time: opts.endTime ?? null,
  };
}

export async function upsertRollCall(
  dateOrOptions: string | UpsertRollCallOptions,
  attendance?: Record<string, boolean>
): Promise<RollCall> {
  const supabase = createAdminClient();
  const opts: UpsertRollCallOptions = typeof dateOrOptions === 'string'
    ? { date: dateOrOptions, attendance: attendance ?? {}, meetingType: 'ritualistica' }
    : dateOrOptions;
  const row = buildRollCallRow(opts);

  if (opts.id) {
    const { data, error } = await supabase.from('roll_calls').update(row).eq('id', opts.id).select('*').single();
    if (error) throw error;
    return toRollCall(data);
  }

  if ((opts.meetingType || 'ritualistica') === 'ritualistica' && !opts.title) {
    const existing = await getRollCallByDate(opts.date);
    if (existing && (existing.meetingType || 'ritualistica') === 'ritualistica' && !existing.title) {
      const { data, error } = await supabase.from('roll_calls').update(row).eq('id', existing.id).select('*').single();
      if (error) throw error;
      return toRollCall(data);
    }
  }

  const { data, error } = await supabase.from('roll_calls').insert(row).select('*').single();
  if (error) throw error;
  return toRollCall(data);
}

export async function deleteRollCall(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from('roll_calls').delete().eq('id', id);
  if (error) throw error;
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
  const candidates = (data || []).map(toCandidate);
  const docs = await getAllCandidateDocuments();
  const byCandidate = new Map<string, CandidateDocument[]>();
  for (const doc of docs) {
    const list = byCandidate.get(doc.candidateId) || [];
    list.push(doc);
    byCandidate.set(doc.candidateId, list);
  }
  return candidates.map((c) => ({ ...c, documents: byCandidate.get(c.id) || [] }));
}

export async function getAllCandidateDocuments(): Promise<CandidateDocument[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('candidate_documents').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(toCandidateDocument);
}

export async function getCandidateDocuments(candidateId: string): Promise<CandidateDocument[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('candidate_documents')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map(toCandidateDocument);
}

export async function getCandidateDocumentByType(candidateId: string, docType: string): Promise<(CandidateDocument & { storagePath: string }) | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('candidate_documents')
    .select('*')
    .eq('candidate_id', candidateId)
    .eq('doc_type', docType)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...toCandidateDocument(data), storagePath: String(data.storage_path) };
}

export async function upsertCandidateDocument(row: {
  candidateId: string;
  docType: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy?: string;
}): Promise<CandidateDocument> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('candidate_documents')
    .upsert(
      {
        candidate_id: row.candidateId,
        doc_type: row.docType,
        storage_path: row.storagePath,
        file_name: row.fileName,
        mime_type: row.mimeType,
        file_size: row.fileSize,
        uploaded_by: row.uploadedBy ?? null,
      },
      { onConflict: 'candidate_id,doc_type' }
    )
    .select('*')
    .single();
  if (error) throw error;
  return toCandidateDocument(data);
}

export async function deleteCandidateDocument(candidateId: string, docType: string): Promise<void> {
  const supabase = createAdminClient();
  const existing = await getCandidateDocumentByType(candidateId, docType);
  if (!existing) return;
  await supabase.from('candidate_documents').delete().eq('candidate_id', candidateId).eq('doc_type', docType);
  try {
    await supabase.storage.from(CANDIDATE_DOCUMENTS_BUCKET).remove([existing.storagePath]);
  } catch {
    // ignora
  }
}

export async function deleteAllCandidateDocuments(candidateId: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: docs } = await supabase
    .from('candidate_documents')
    .select('storage_path')
    .eq('candidate_id', candidateId);
  if (docs?.length) {
    const paths = docs.map((d) => String(d.storage_path)).filter(Boolean);
    if (paths.length) {
      try {
        await supabase.storage.from(CANDIDATE_DOCUMENTS_BUCKET).remove(paths);
      } catch {
        // ignora
      }
    }
  }
  await supabase.from('candidate_documents').delete().eq('candidate_id', candidateId);
}

export async function downloadCandidateDocumentFile(storagePath: string): Promise<{ buffer: Buffer; contentType: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(CANDIDATE_DOCUMENTS_BUCKET).download(storagePath);
  if (error || !data) throw error ?? new Error('Arquivo não encontrado');
  const buffer = Buffer.from(await data.arrayBuffer());
  return { buffer, contentType: data.type || 'application/octet-stream' };
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
  if (partial.sindicanciaResumo !== undefined) row.sindicancia_resumo = partial.sindicanciaResumo || null;
  const { data, error } = await supabase.from('membership_candidates').update(row).eq('id', id).select('*').single();
  if (error) throw error;
  return toCandidate(data);
}

export async function deleteCandidate(id: string): Promise<void> {
  const supabase = createAdminClient();
  await deleteAllCandidateDocuments(id);
  const { error } = await supabase.from('membership_candidates').delete().eq('id', id);
  if (error) throw error;
}

// ---------- Raffles ----------
function toRaffle(row: Record<string, unknown>): Raffle {
  const prizes = Array.isArray(row.prizes) ? (row.prizes as string[]) : [];
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description ? String(row.description) : undefined,
    pricePerNumber: Number(row.price_per_number ?? 0),
    prizes,
    drawAt: String(row.draw_at ?? ''),
    whatsappContact: String(row.whatsapp_contact ?? ''),
    pixKey: String(row.pix_key ?? ''),
    totalNumbers: Number(row.total_numbers ?? 100),
    status: (row.status as RaffleStatus) || 'active',
    bannerUrl: row.banner_url ? String(row.banner_url) : undefined,
    createdBy: row.created_by ? String(row.created_by) : undefined,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
    soldCount: row.sold_count != null ? Number(row.sold_count) : undefined,
  };
}

function toRaffleSale(row: Record<string, unknown>, numbers: number[] = []): RaffleSale {
  return {
    id: String(row.id),
    raffleId: String(row.raffle_id),
    buyerName: String(row.buyer_name),
    buyerPhone: String(row.buyer_phone),
    buyerPhoneExtra: row.buyer_phone_extra ? String(row.buyer_phone_extra) : undefined,
    sellerUserId: row.seller_user_id ? String(row.seller_user_id) : undefined,
    receiptPath: row.receipt_path ? String(row.receipt_path) : undefined,
    receiptFileName: row.receipt_file_name ? String(row.receipt_file_name) : undefined,
    numbers,
    createdAt: String(row.created_at ?? ''),
  };
}

export async function getRaffles(opts?: { status?: RaffleStatus }): Promise<Raffle[]> {
  const supabase = createAdminClient();
  let query = supabase.from('raffles').select('*').order('draw_at', { ascending: false });
  if (opts?.status) query = query.eq('status', opts.status);
  const { data, error } = await query;
  if (error) throw error;

  const raffles = (data || []).map(toRaffle);
  if (raffles.length === 0) return raffles;

  const ids = raffles.map((r) => r.id);
  const { data: counts, error: countError } = await supabase
    .from('raffle_sale_numbers')
    .select('raffle_id')
    .in('raffle_id', ids);
  if (countError) throw countError;

  const countMap = new Map<string, number>();
  for (const row of counts || []) {
    const id = String(row.raffle_id);
    countMap.set(id, (countMap.get(id) || 0) + 1);
  }
  return raffles.map((r) => ({ ...r, soldCount: countMap.get(r.id) || 0 }));
}

export async function getRaffleById(id: string): Promise<Raffle | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('raffles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const raffle = toRaffle(data);
  const { count } = await supabase
    .from('raffle_sale_numbers')
    .select('*', { count: 'exact', head: true })
    .eq('raffle_id', id);
  return { ...raffle, soldCount: count ?? 0 };
}

export async function getRaffleSoldNumbers(raffleId: string): Promise<RaffleSoldNumber[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('raffle_sale_numbers')
    .select('number, buyer_name')
    .eq('raffle_id', raffleId)
    .order('number', { ascending: true });
  if (error) throw error;
  return (data || []).map((row) => ({
    number: Number(row.number),
    buyerName: String(row.buyer_name),
  }));
}

export async function getPublicRaffles(): Promise<PublicRaffle[]> {
  const raffles = await getRaffles({ status: 'active' });
  const result: PublicRaffle[] = [];
  for (const raffle of raffles) {
    const soldNumbers = await getRaffleSoldNumbers(raffle.id);
    result.push(sanitizePublicRaffle(raffle, soldNumbers));
  }
  return result;
}

export interface InsertRaffleOptions {
  title: string;
  description?: string;
  pricePerNumber: number;
  prizes: string[];
  drawAt: string;
  whatsappContact: string;
  pixKey: string;
  totalNumbers: number;
  bannerUrl?: string;
  createdBy?: string;
}

export async function insertRaffle(opts: InsertRaffleOptions): Promise<Raffle> {
  const supabase = createAdminClient();
  const row = {
    title: opts.title.trim(),
    description: opts.description?.trim() || null,
    price_per_number: opts.pricePerNumber,
    prizes: opts.prizes,
    draw_at: opts.drawAt,
    whatsapp_contact: opts.whatsappContact.trim(),
    pix_key: opts.pixKey.trim(),
    total_numbers: opts.totalNumbers,
    banner_url: opts.bannerUrl?.trim() || null,
    status: 'active',
    created_by: opts.createdBy ?? null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('raffles').insert(row).select('*').single();
  if (error) throw error;
  return toRaffle(data);
}

export async function updateRaffle(id: string, partial: Partial<InsertRaffleOptions> & { status?: RaffleStatus }): Promise<Raffle> {
  const supabase = createAdminClient();

  if (partial.totalNumbers !== undefined) {
    const current = await getRaffleById(id);
    if (!current) throw new Error('Sorteio não encontrado');
    const sold = current.soldCount ?? 0;
    if (partial.totalNumbers < sold) {
      throw new Error(`Não é possível reduzir abaixo de ${sold} números já vendidos`);
    }
    if (partial.totalNumbers > 10000) {
      throw new Error('Quantidade máxima de números é 10000');
    }
  }

  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (partial.title !== undefined) row.title = partial.title.trim();
  if (partial.description !== undefined) row.description = partial.description?.trim() || null;
  if (partial.pricePerNumber !== undefined) row.price_per_number = partial.pricePerNumber;
  if (partial.prizes !== undefined) row.prizes = partial.prizes;
  if (partial.drawAt !== undefined) row.draw_at = partial.drawAt;
  if (partial.whatsappContact !== undefined) row.whatsapp_contact = partial.whatsappContact.trim();
  if (partial.pixKey !== undefined) row.pix_key = partial.pixKey.trim();
  if (partial.totalNumbers !== undefined) row.total_numbers = partial.totalNumbers;
  if (partial.bannerUrl !== undefined) row.banner_url = partial.bannerUrl?.trim() || null;
  if (partial.status !== undefined) row.status = partial.status;
  const { data, error } = await supabase.from('raffles').update(row).eq('id', id).select('*').single();
  if (error) throw error;
  return toRaffle(data);
}

export async function deleteRaffle(id: string): Promise<void> {
  const supabase = createAdminClient();
  const sales = await getRaffleSales(id);
  for (const sale of sales) {
    if (sale.receiptPath) {
      await supabase.storage.from(RAFFLE_RECEIPTS_BUCKET).remove([sale.receiptPath]);
    }
  }
  const { error } = await supabase.from('raffles').delete().eq('id', id);
  if (error) throw error;
}

export async function getRaffleSales(raffleId: string): Promise<RaffleSale[]> {
  const supabase = createAdminClient();
  const { data: sales, error } = await supabase
    .from('raffle_sales')
    .select('*')
    .eq('raffle_id', raffleId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!sales?.length) return [];

  const saleIds = sales.map((s) => s.id);
  const { data: numbers, error: numError } = await supabase
    .from('raffle_sale_numbers')
    .select('sale_id, number')
    .in('sale_id', saleIds)
    .order('number', { ascending: true });
  if (numError) throw numError;

  const numbersBySale = new Map<string, number[]>();
  for (const row of numbers || []) {
    const sid = String(row.sale_id);
    const list = numbersBySale.get(sid) || [];
    list.push(Number(row.number));
    numbersBySale.set(sid, list);
  }

  return sales.map((s) => toRaffleSale(s, numbersBySale.get(String(s.id)) || []));
}

export async function getRaffleSoldReportRows(raffleId: string): Promise<RaffleSoldReportRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('raffle_sale_numbers')
    .select('raffle_id, number, sale_id, buyer_name, raffle_sales!inner(buyer_phone, buyer_phone_extra, created_at)')
    .eq('raffle_id', raffleId)
    .order('number', { ascending: true });
  if (error) throw error;

  return (data || []).map((row) => {
    const sale = (row as unknown as { raffle_sales?: { buyer_phone: string; buyer_phone_extra?: string | null; created_at: string } }).raffle_sales;
    return {
      raffleId: String((row as any).raffle_id),
      saleId: String((row as any).sale_id),
      number: Number((row as any).number),
      buyerName: String((row as any).buyer_name),
      buyerPhone: sale?.buyer_phone ? String(sale.buyer_phone) : '',
      buyerPhoneExtra: sale?.buyer_phone_extra ? String(sale.buyer_phone_extra) : undefined,
      soldAt: sale?.created_at ? String(sale.created_at) : '',
    };
  });
}

export interface InsertRaffleSaleOptions {
  raffleId: string;
  buyerName: string;
  buyerPhone: string;
  buyerPhoneExtra?: string;
  numbers: number[];
  sellerUserId?: string;
  receiptPath?: string;
  receiptFileName?: string;
}

export async function insertRaffleSale(opts: InsertRaffleSaleOptions): Promise<RaffleSale> {
  const supabase = createAdminClient();
  const { MAX_NUMBERS_PER_SALE } = await import('@/lib/raffles-security');

  const raffle = await getRaffleById(opts.raffleId);
  if (!raffle) throw new Error('Sorteio não encontrado');
  if (raffle.status !== 'active') throw new Error('Este sorteio não está ativo para vendas');

  const uniqueNumbers = [...new Set(opts.numbers)].sort((a, b) => a - b);
  if (uniqueNumbers.length === 0) throw new Error('Selecione ao menos um número');
  if (uniqueNumbers.length > MAX_NUMBERS_PER_SALE) {
    throw new Error(`Máximo de ${MAX_NUMBERS_PER_SALE} números por venda`);
  }
  for (const n of uniqueNumbers) {
    if (n < 1 || n > raffle.totalNumbers) {
      throw new Error(`Número ${n} inválido para este sorteio`);
    }
  }

  const { data: taken, error: takenError } = await supabase
    .from('raffle_sale_numbers')
    .select('number')
    .eq('raffle_id', opts.raffleId)
    .in('number', uniqueNumbers);
  if (takenError) throw takenError;
  if (taken && taken.length > 0) {
    const nums = taken.map((t) => t.number).join(', ');
    throw new Error(`Número(s) já vendido(s): ${nums}`);
  }

  const { data: sale, error: saleError } = await supabase
    .from('raffle_sales')
    .insert({
      raffle_id: opts.raffleId,
      buyer_name: opts.buyerName,
      buyer_phone: opts.buyerPhone,
      buyer_phone_extra: opts.buyerPhoneExtra || null,
      seller_user_id: opts.sellerUserId ?? null,
      receipt_path: opts.receiptPath ?? null,
      receipt_file_name: opts.receiptFileName ?? null,
    })
    .select('*')
    .single();
  if (saleError) throw saleError;

  const numberRows = uniqueNumbers.map((number) => ({
    raffle_id: opts.raffleId,
    number,
    sale_id: sale.id,
    buyer_name: opts.buyerName,
  }));
  const { error: numInsertError } = await supabase.from('raffle_sale_numbers').insert(numberRows);
  if (numInsertError) {
    await supabase.from('raffle_sales').delete().eq('id', sale.id);
    throw numInsertError;
  }

  return toRaffleSale(sale, uniqueNumbers);
}

export async function getRaffleSaleById(raffleId: string, saleId: string): Promise<RaffleSale | null> {
  const supabase = createAdminClient();
  const { data: sale, error } = await supabase
    .from('raffle_sales')
    .select('*')
    .eq('id', saleId)
    .eq('raffle_id', raffleId)
    .maybeSingle();
  if (error) throw error;
  if (!sale) return null;

  const { data: numbers, error: numError } = await supabase
    .from('raffle_sale_numbers')
    .select('number')
    .eq('sale_id', saleId)
    .order('number', { ascending: true });
  if (numError) throw numError;

  return toRaffleSale(sale, (numbers || []).map((n) => Number(n.number)));
}

export async function downloadRaffleReceiptFile(storagePath: string): Promise<{ buffer: Buffer; contentType: string }> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(RAFFLE_RECEIPTS_BUCKET).download(storagePath);
  if (error || !data) throw error ?? new Error('Comprovante não encontrado');
  const buffer = Buffer.from(await data.arrayBuffer());
  return { buffer, contentType: data.type || 'application/octet-stream' };
}

export async function deleteRaffleSoldNumber(
  raffleId: string,
  number: number
): Promise<{ deleted: boolean; saleDeleted: boolean }> {
  const supabase = createAdminClient();

  const { data: row, error: findError } = await supabase
    .from('raffle_sale_numbers')
    .select('sale_id')
    .eq('raffle_id', raffleId)
    .eq('number', number)
    .maybeSingle();
  if (findError) throw findError;
  if (!row) return { deleted: false, saleDeleted: false };

  const saleId = String(row.sale_id);

  const { error: delNumError } = await supabase
    .from('raffle_sale_numbers')
    .delete()
    .eq('raffle_id', raffleId)
    .eq('number', number);
  if (delNumError) throw delNumError;

  const { count, error: countError } = await supabase
    .from('raffle_sale_numbers')
    .select('*', { count: 'exact', head: true })
    .eq('sale_id', saleId);
  if (countError) throw countError;

  if ((count ?? 0) > 0) {
    return { deleted: true, saleDeleted: false };
  }

  const { data: sale, error: saleError } = await supabase
    .from('raffle_sales')
    .select('receipt_path')
    .eq('id', saleId)
    .maybeSingle();
  if (saleError) throw saleError;

  const receiptPath = sale?.receipt_path ? String(sale.receipt_path) : null;

  const { error: delSaleError } = await supabase.from('raffle_sales').delete().eq('id', saleId);
  if (delSaleError) throw delSaleError;

  if (receiptPath) {
    try {
      await supabase.storage.from(RAFFLE_RECEIPTS_BUCKET).remove([receiptPath]);
    } catch {
      /* ignore storage cleanup failure */
    }
  }

  return { deleted: true, saleDeleted: true };
}
