export interface CandidaturaDownloadDef {
  slug: string;
  label: string;
  description: string;
  downloadFilename: string;
  /** Trecho único do nome do arquivo em public/candidaturas */
  fileMatch: string;
}

export const CANDIDATURA_DOWNLOAD_DEFS: CandidaturaDownloadDef[] = [
  {
    slug: 'ficha-solicitacao-demolay',
    label: 'Ficha de Sindicância DeMolay',
    description: 'Ficha de solicitação de entrada na Ordem DeMolay.',
    downloadFilename: 'ficha_solicitacao_demolay.pdf',
    fileMatch: 'Ficha de Solicit',
  },
  {
    slug: 'questionario-sindicancia-criancas',
    label: 'Questionário de Sindicância Admissional — Crianças',
    description: 'Questionário de sindicância para candidatos de 12 a 14 anos.',
    downloadFilename: 'questionario_sindicancia_criancas.pdf',
    fileMatch: 'CRIAN',
  },
  {
    slug: 'questionario-sindicancia-menor-idade',
    label: 'Questionário de Sindicância Admissional — Menor Idade',
    description: 'Questionário de sindicância para jovens de 15 a 17 anos.',
    downloadFilename: 'questionario_sindicancia_menor_idade.pdf',
    fileMatch: 'MENOR IDADE',
  },
  {
    slug: 'questionario-sindicancia-maioridade',
    label: 'Questionário de Sindicância Admissional — Maioridade',
    description: 'Questionário de sindicância para candidatos de 18 a 20 anos.',
    downloadFilename: 'questionario_sindicancia_maioridade.pdf',
    fileMatch: 'MAIORIDADE',
  },
];

export function findCandidaturaDownload(slug: string): CandidaturaDownloadDef | undefined {
  return CANDIDATURA_DOWNLOAD_DEFS.find((d) => d.slug === slug);
}
