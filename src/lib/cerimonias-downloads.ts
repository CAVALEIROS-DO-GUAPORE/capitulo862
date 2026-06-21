export interface CerimoniaDownloadDef {
  slug: string;
  label: string;
  description: string;
  downloadFilename: string;
}

export const CERIMONIA_DOWNLOAD_DEFS: CerimoniaDownloadDef[] = [
  {
    slug: 'abertura-e-encerramento-de-cerimonia-publicas',
    label: 'Abertura e Encerramento de Cerimônias Públicas',
    description: 'PDF da cerimônia.',
    downloadFilename: 'abertura-e-encerramento-de-cerimonia-publicas.pdf',
  },
  {
    slug: 'cerimonia-antes-que-seja-tarde',
    label: 'Cerimônia Antes que Seja Tarde',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-antes-que-seja-tarde.pdf',
  },
  {
    slug: 'cerimonia-da-espada',
    label: 'Cerimônia da Espada',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-da-espada.pdf',
  },
  {
    slug: 'cerimonia-da-luz',
    label: 'Cerimônia da Luz',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-da-luz.pdf',
  },
  {
    slug: 'cerimonia-da-maioridade',
    label: 'Cerimônia da Maioridade',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-da-maioridade.pdf',
  },
  {
    slug: 'cerimonia-das-armas',
    label: 'Cerimônia das Armas',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-das-armas.pdf',
  },
  {
    slug: 'cerimonia-das-flores',
    label: 'Cerimônia das Flores',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-das-flores.pdf',
  },
  {
    slug: 'cerimonia-das-nove-horas',
    label: 'Cerimônia das Nove Horas',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-das-nove-horas.pdf',
  },
  {
    slug: 'cerimonia-de-apresentacao-de-visitantes-ilustres',
    label: 'Cerimônia de Apresentação de Visitantes Ilustres',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-de-apresentacao-de-visitantes-ilustres.pdf',
  },
  {
    slug: 'cerimonia-de-instalacao-de-colegio-alumni',
    label: 'Cerimônia de Instalação de Colégio Alumni',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-de-instalacao-de-colegio-alumni.pdf',
  },
  {
    slug: 'cerimonia-de-instalacao-de-oficiais-mestre-conselheiro-ao-preceptor',
    label: 'Cerimônia de Instalação de Oficiais — Mestre Conselheiro ao Preceptor',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-de-instalacao-de-oficiais-mestre-conselheiro-ao-preceptor.pdf',
  },
  {
    slug: 'cerimonia-de-instalacao-de-oficiais-inversa-preceptor-ao-mestre-conselheiro',
    label: 'Cerimônia de Instalação de Oficiais Inversa — Preceptor ao Mestre Conselheiro',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-de-instalacao-de-oficiais-inversa-preceptor-ao-mestre-conselheiro.pdf',
  },
  {
    slug: 'cerimonia-de-instalacao-do-clube-de-maes-e-amigos',
    label: 'Cerimônia de Instalação do Clube de Mães e Amigos',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-de-instalacao-do-clube-de-maes-e-amigos.pdf',
  },
  {
    slug: 'cerimonia-de-instalacao-do-conselho-consultivo',
    label: 'Cerimônia de Instalação do Conselho Consultivo',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-de-instalacao-do-conselho-consultivo.pdf',
  },
  {
    slug: 'cerimonia-de-recepcao-de-grande-mestre',
    label: 'Cerimônia de Recepção de Grande Mestre',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-de-recepcao-de-grande-mestre.pdf',
  },
  {
    slug: 'cerimonia-do-abraco',
    label: 'Cerimônia do Abraço',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-do-abraco.pdf',
  },
  {
    slug: 'cerimonia-do-cavaleiro-da-rosa',
    label: 'Cerimônia do Cavaleiro da Rosa',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-do-cavaleiro-da-rosa.pdf',
  },
  {
    slug: 'cerimonia-do-emblema',
    label: 'Cerimônia do Emblema',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-do-emblema.pdf',
  },
  {
    slug: 'cerimonia-do-representante-demolay',
    label: 'Cerimônia do Representante DeMolay',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-do-representante-demolay.pdf',
  },
  {
    slug: 'cerimonia-dos-pais',
    label: 'Cerimônia dos Pais',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-dos-pais.pdf',
  },
  {
    slug: 'cerimonia-em-homenagem-a-patria',
    label: 'Cerimônia em Homenagem à Pátria',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-em-homenagem-a-patria.pdf',
  },
  {
    slug: 'cerimonia-em-memoria-para-adultos',
    label: 'Cerimônia em Memória para Adultos',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-em-memoria-para-adultos.pdf',
  },
  {
    slug: 'cerimonia-funebre-em-memoria',
    label: 'Cerimônia Fúnebre — em Memória',
    description: 'PDF da cerimônia.',
    downloadFilename: 'cerimonia-funebre-em-memoria.pdf',
  },
];

export function findCerimoniaDownload(slug: string): CerimoniaDownloadDef | undefined {
  return CERIMONIA_DOWNLOAD_DEFS.find((d) => d.slug === slug);
}
