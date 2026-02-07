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

export interface Member {
  id: string;
  name: string;
  photo?: string;
  role: string;
  category: MemberCategory;
  order: number;
  userId?: string;
  phone?: string;
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
}

export interface InternalMinutes {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  authorId: string;
}

export interface FinanceEntry {
  id: string;
  type: 'entrada' | 'saida';
  amount: number;
  description: string;
  date: string;
  createdAt: string;
}

export type CalendarEventType = 'ritualistica' | 'evento' | 'reuniao' | 'outro';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string;
  type: CalendarEventType;
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
}
