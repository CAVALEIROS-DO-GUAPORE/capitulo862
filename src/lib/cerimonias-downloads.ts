export interface CerimoniaDownloadDef {
  slug: string;
  label: string;
  description: string;
  downloadFilename: string;
}

export const CERIMONIA_DOWNLOAD_DEFS: CerimoniaDownloadDef[] = [
  {
    slug: 'abertura-e-encerramento-de-cerimonia-publicas',
    label: 'ABERTURA E ENCERRAMENTO DE CERIMONIA PUBLICAS',
    description: 'PDF da cerimônia.',
    downloadFilename: 'abertura-e-encerramento-de-cerimonia-publicas.pdf',
  },
  {
    slug: 'cerimonia-antes-que-seja-tarde',
    label: 'CERIMONIA ANTES QUE SEJA TARDE',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-antes-que-seja-tarde.pdf',
  },
  {
    slug: 'cerimonia-da-espada',
    label: 'CERIMÔNIA DA ESPADA',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-da-espada.pdf',
  },
  {
    slug: 'cerimonia-da-luz',
    label: 'CERIMONIA DA LUZ',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-da-luz.pdf',
  },
  {
    slug: 'cerimonia-da-maioridade',
    label: 'CERIMONIA DA MAIORIDADE',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-da-maioridade.pdf',
  },
  {
    slug: 'cerimonia-das-armas',
    label: 'CERIMÔNIA DAS ARMAS',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-das-armas.pdf',
  },
  {
    slug: 'cerimonia-das-flores',
    label: 'CERIMONIA DAS FLORES',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-das-flores.pdf',
  },
  {
    slug: 'cerimonia-das-nove-horas',
    label: 'CERIMONIA DAS NOVE HORAS',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-das-nove-horas.pdf',
  },
  {
    slug: 'cerimonia-de-apresentacao-de-visitantes-ilustres',
    label: 'CERIMÔNIA DE APRESENTAÇÃO DE VISITANTES ILUSTRES',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-de-apresentacao-de-visitantes-ilustres.pdf',
  },
  {
    slug: 'cerimonia-de-instalacao-de-colegio-alumni',
    label: 'CERIMONIA DE INSTALAÇÃO DE COLÉGIO ALUMNI',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-de-instalacao-de-colegio-alumni.pdf',
  },
  {
    slug: 'cerimonia-de-instalacao-de-oficiais-mestre-conselheiro-ao-preceptor',
    label: 'CERIMONIA DE INSTALAÇÃO DE OFICIAIS - MESTRE CONSELHEIRO AO PRECEPTOR',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-de-instalacao-de-oficiais-mestre-conselheiro-ao-preceptor.pdf',
  },
  {
    slug: 'cerimonia-de-instalacao-de-oficiais-inversa-preceptor-ao-mestre-conselheiro',
    label: 'CERIMONIA DE INSTALAÇÃO DE OFICIAIS INVERSA - PRECEPTOR AO MESTRE CONSELHEIRO',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-de-instalacao-de-oficiais-inversa-preceptor-ao-mestre-conselheiro.pdf',
  },
  {
    slug: 'cerimonia-de-instalacao-do-clube-de-maes-e-amigos',
    label: 'CERIMÔNIA DE INSTALAÇÃO DO CLUBE DE MAES E AMIGOS',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-de-instalacao-do-clube-de-maes-e-amigos.pdf',
  },
  {
    slug: 'cerimonia-de-instalacao-do-conselho-consultivo',
    label: 'CERIMÔNIA DE INSTALAÇÃO DO CONSELHO CONSULTIVO',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-de-instalacao-do-conselho-consultivo.pdf',
  },
  {
    slug: 'cerimonia-de-recepcao-de-grande-mestre',
    label: 'CERIMÔNIA DE RECEPÇÃO DE GRANDE MESTRE',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-de-recepcao-de-grande-mestre.pdf',
  },
  {
    slug: 'cerimonia-do-abraco',
    label: 'CERIMONIA DO ABRAÇO',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-do-abraco.pdf',
  },
  {
    slug: 'cerimonia-do-cavaleiro-da-rosa',
    label: 'CERIMÔNIA DO CAVALEIRO DA ROSA',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-do-cavaleiro-da-rosa.pdf',
  },
  {
    slug: 'cerimonia-do-emblema',
    label: 'CERIMONIA DO EMBLEMA',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-do-emblema.pdf',
  },
  {
    slug: 'cerimonia-do-representante-demolay',
    label: 'CERIMONIA DO REPRESENTANTE DEMOLAY',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-do-representante-demolay.pdf',
  },
  {
    slug: 'cerimonia-dos-pais',
    label: 'CERIMONIA DOS PAIS',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-dos-pais.pdf',
  },
  {
    slug: 'cerimonia-em-homenagem-a-patria',
    label: 'CERIMÔNIA EM HOMENAGEM À PATRIA',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-em-homenagem-a-patria.pdf',
  },
  {
    slug: 'cerimonia-em-memoria-para-adultos',
    label: 'CERIMONIA EM MEMORIA PARA ADULTOS',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-em-memoria-para-adultos.pdf',
  },
  {
    slug: 'cerimonia-funebre-em-memoria',
    label: 'CERIMÔNIA FÚNEBRE - EM MEMÓRIA',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-funebre-em-memoria.pdf',
  },
];

export function findCerimoniaDownload(slug: string): CerimoniaDownloadDef | undefined {
  return CERIMONIA_DOWNLOAD_DEFS.find((d) => d.slug === slug);
}
