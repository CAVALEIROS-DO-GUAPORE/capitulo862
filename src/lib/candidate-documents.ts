export const CANDIDATE_SOLICITATION_DOC_TYPES = [
  'ficha_solicitacao',
  'documento_identidade',
  'certidao_nascimento',
  'foto_3x4',
  'comprovante_endereco',
] as const;

export const CANDIDATE_SINDICANCIA_DOC_TYPE = 'ficha_sindicancia' as const;

export type CandidateSolicitationDocType = (typeof CANDIDATE_SOLICITATION_DOC_TYPES)[number];
export type CandidateDocType = CandidateSolicitationDocType | typeof CANDIDATE_SINDICANCIA_DOC_TYPE;

export const CANDIDATE_DOC_LABELS: Record<CandidateDocType, string> = {
  ficha_solicitacao: 'Ficha de Solicitação',
  documento_identidade: 'Documento de Identidade',
  certidao_nascimento: 'Certidão de Nascimento ou Outras',
  foto_3x4: 'Foto 3x4',
  comprovante_endereco: 'Comprovante de Endereço',
  ficha_sindicancia: 'Ficha de Sindicância',
};

export function isCandidateDocType(value: string): value is CandidateDocType {
  return value in CANDIDATE_DOC_LABELS;
}
