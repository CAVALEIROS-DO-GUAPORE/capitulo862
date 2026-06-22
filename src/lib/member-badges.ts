export const MEMBER_BADGE_IDS = [
  'tag_cavaleiro',
  'tag_chevalier',
  'tag_conselho',
  'tag_demolay',
  'tag_dm_macom',
  'tag_macom',
  'tag_past_mc',
  'tag_senior',
  'tag_servico_meritorio',
  'tag_iniciatico',
  'tag_escrivao',
  'tag_hospitaleiro',
  'tag_tesoureiro',
] as const;

export type MemberBadgeId = (typeof MEMBER_BADGE_IDS)[number];

export interface MemberBadgeDefinition {
  id: MemberBadgeId;
  label: string;
  description: string;
  image: string;
}

export const MEMBER_BADGES: MemberBadgeDefinition[] = [
  {
    id: 'tag_cavaleiro',
    label: 'Cavaleiro',
    description: 'Membro da Ordem da Cavalaria',
    image: '/tags/tag_cavaleiro.png',
  },
  {
    id: 'tag_chevalier',
    label: 'Chevalier',
    description: 'Mérito Chevalier',
    image: '/tags/tag_chevalier.png',
  },
  {
    id: 'tag_conselho',
    label: 'Conselho Consultivo',
    description: 'Membro do Conselho Consultivo',
    image: '/tags/tag_conselho.png',
  },
  {
    id: 'tag_demolay',
    label: 'DeMolay',
    description: 'Membro elevado da Ordem DeMolay',
    image: '/tags/tag_demolay.png',
  },
  {
    id: 'tag_dm_macom',
    label: 'DeMolay Maçom',
    description: 'DeMolay que também é maçom',
    image: '/tags/tag_dm_macom.png',
  },
  {
    id: 'tag_macom',
    label: 'Maçom',
    description: 'Membro da maçonaria',
    image: '/tags/tag_macom.png',
  },
  {
    id: 'tag_past_mc',
    label: 'Past MC',
    description: 'Antigo Mestre Conselheiro',
    image: '/tags/tag_past_mc.png',
  },
  {
    id: 'tag_senior',
    label: 'Sênior',
    description: 'Membro sênior DeMolay',
    image: '/tags/tag_senior.png',
  },
  {
    id: 'tag_servico_meritorio',
    label: 'Serviço Meritório',
    description: 'Reconhecido por concluir as atividades de Mestre Conselheiro em sua gestão',
    image: '/tags/tag_servico_meritorio.png',
  },
  {
    id: 'tag_iniciatico',
    label: 'Iniciático',
    description: 'DeMolay iniciático',
    image: '/tags/tag_iniciatico.png',
  },
  {
    id: 'tag_escrivao',
    label: 'Escrivão',
    description: 'Reconhecido por concluir a campanha Caneta de Ouro',
    image: '/tags/tag_escrivao.png',
  },
  {
    id: 'tag_hospitaleiro',
    label: 'Hospitaleiro',
    description: 'Reconhecido por concluir a campanha de Hospitalaria',
    image: '/tags/tag_hospitaleiro.png',
  },
  {
    id: 'tag_tesoureiro',
    label: 'Tesoureiro',
    description: 'Reconhecido por concluir a campanha Chave de Ouro',
    image: '/tags/tag_tesoureiro.png',
  },
];

const badgeById = new Map(MEMBER_BADGES.map((b) => [b.id, b]));

export function isMemberBadgeId(value: string): value is MemberBadgeId {
  return (MEMBER_BADGE_IDS as readonly string[]).includes(value);
}

export function getMemberBadge(id: string): MemberBadgeDefinition | undefined {
  return isMemberBadgeId(id) ? badgeById.get(id) : undefined;
}

export function parseMemberBadges(raw: unknown): MemberBadgeId[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is MemberBadgeId => typeof id === 'string' && isMemberBadgeId(id));
}

export function normalizeMemberBadges(badges: string[]): MemberBadgeId[] {
  const unique = new Set<MemberBadgeId>();
  for (const id of badges) {
    if (isMemberBadgeId(id)) unique.add(id);
  }
  return MEMBER_BADGE_IDS.filter((id) => unique.has(id));
}
