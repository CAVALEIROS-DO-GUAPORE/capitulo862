export type UserRole = 
  | 'admin' 
  | 'mestre_conselheiro' 
  | 'primeiro_conselheiro' 
  | 'segundo_conselheiro'
  | 'escrivao'
  | 'hospitaleiro'
  | 'tesoureiro'
  | 'membro'
  | 'presidente_seniores'
  | 'vice_presidente_seniores'
  | 'senior'
  | 'presidente_consultivo'
  | 'membro_organizador'
  | 'consultor'
  | 'mestre_escudeiro'
  | 'primeiro_escudeiro'
  | 'segundo_escudeiro'
  | 'escudeiro';

export type MemberCategory = 'demolays' | 'seniores' | 'consultores' | 'escudeiros';

export type MemberBadgeId =
  | 'tag_cavaleiro'
  | 'tag_chevalier'
  | 'tag_conselho'
  | 'tag_demolay'
  | 'tag_dm_macom'
  | 'tag_macom'
  | 'tag_past_mc'
  | 'tag_senior'
  | 'tag_servico_meritorio'
  | 'tag_iniciatico'
  | 'tag_escrivao'
  | 'tag_hospitaleiro'
  | 'tag_tesoureiro';

/** Outra categoria/cargo do mesmo membro (ex.: Sênior que também é Consultor) */
export interface MemberAdditionalRole {
  category: MemberCategory;
  role: string;
}

export interface Member {
  id: string;
  name: string;
  photo?: string;
  role: string;
  category: MemberCategory;
  order: number;
  userId?: string;
  phone?: string;
  /** Número identificador do membro (ID). Use 0 se ainda não definido. */
  identifier?: number;
  /** Outras categorias/cargos (ex.: Presidente dos Sêniores + Consultor) — não duplica a pessoa */
  additionalRoles?: MemberAdditionalRole[];
  /** Emblemas concedidos pelo Conselho Consultivo ou admin */
  badges?: MemberBadgeId[];
}

export interface News {
  id: string;
  title: string;
  description: string;
  image?: string;
  instagramUrl?: string;
  images: string[];
  createdAt: string;
  authorId?: string;
  authorName?: string;
  authorRole?: string;
}

export type AtaType = 'RITUALISTICA' | 'ADMINISTRATIVA' | 'EVENTO' | 'OUTROS';

export type MeetingType = 'ritualistica' | 'administrativa' | 'controle';

export interface RollCall {
  id: string;
  date: string;
  attendance: Record<string, boolean>;
  createdAt: string;
  authorId: string;
  /** Gestão no formato ano/período (ex.: 2026/2) ou legado 1/2 */
  gestao?: string;
  tipoReuniao?: string;
  breveDescricao?: string;
  meetingType?: MeetingType;
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
}

export interface AttendanceRankingEntry {
  memberId: string;
  name: string;
  photo?: string;
  count: number;
  percentage: number;
  totalMeetings: number;
}

export interface InternalMinutes {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  authorId: string;
  status?: 'rascunho' | 'publicada';
  ataNumber?: number;
  ataYear?: number;
  date?: string;
  startTime?: string;
  endTime?: string;
  type?: AtaType;
  ourLodge?: boolean;
  locationName?: string;
  city?: string;
  rollCallId?: string;
  rollCallDate?: string;
  presidingMc?: string;
  presiding1c?: string;
  presiding2c?: string;
  tiosPresentes?: string[];
  trabalhosTexto?: string;
  escrivaoName?: string;
  /** Gestão 1 ou 2 (definido pelo escrivão ao preencher a ata). */
  ataGestao?: string;
  /** Nome do tio escolhido como "líder" do conselho na ata. */
  tioConselho?: string;
  /** Palavra secreta (opcional; apenas reunião ritualística). */
  palavraSecreta?: string;
  /** Tópicos discutidos na reunião, separados por vírgula. */
  pauta?: string;
}

export interface FinanceEntry {
  id: string;
  type: 'entrada' | 'saida';
  amount: number;
  description: string;
  date: string;
  createdAt: string;
  receiptCount?: number;
}

export interface FinanceReceipt {
  id: string;
  financeEntryId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
  storagePath: string;
}

export type CalendarEventType = 'ritualistica' | 'evento' | 'reuniao' | 'outro';

/** Categoria no calendário: evento (normal) ou atividades_mensais (edital) */
export type CalendarEventCategory = 'evento' | 'atividades_mensais';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: CalendarEventType;
  /** 'evento' = calendário normal; 'atividades_mensais' = atividade obrigatória com prazo */
  category?: CalendarEventCategory;
  /** Horário do evento (ex: "19h") */
  startTime?: string;
  /** Para atividades_mensais: último dia para enviar (YYYY-MM-DD) */
  dateEnd?: string;
  /** Para atividades_mensais: se já foi enviada */
  enviado?: boolean;
}

export interface MembershipCandidate {
  id: string;
  fullName: string;
  motherName: string;
  fatherName?: string;
  birthDate: string;
  city: string;
  fatherIsMason: boolean;
  phone: string;
  email: string;
  knowsDemolay: boolean;
  demolayContactName?: string;
  interestReason: string;
  createdAt: string;
  readByMc?: boolean;
  readByFirstCounselor?: boolean;
  sindicanciaResumo?: string;
  documents?: CandidateDocument[];
}

export interface CandidateDocument {
  id: string;
  candidateId: string;
  docType: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

export type RaffleStatus = 'active' | 'closed' | 'drawn';

export interface Raffle {
  id: string;
  title: string;
  description?: string;
  pricePerNumber: number;
  prizes: string[];
  drawAt: string;
  whatsappContact: string;
  pixKey: string;
  totalNumbers: number;
  status: RaffleStatus;
  bannerUrl?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  soldCount?: number;
}

export interface RaffleSoldNumber {
  number: number;
  buyerName: string;
}

export interface RaffleSale {
  id: string;
  raffleId: string;
  buyerName: string;
  buyerPhone: string;
  buyerPhoneExtra?: string;
  sellerUserId?: string;
  receiptPath?: string;
  receiptFileName?: string;
  numbers: number[];
  createdAt: string;
}

export interface PublicRaffle extends Raffle {
  soldNumbers: RaffleSoldNumber[];
}
