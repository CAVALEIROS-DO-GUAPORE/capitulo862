import type { Member, News } from '@/types';

export const CHAPTER_NAME = 'Cavaleiros do Guaporé';
export const CHAPTER_NUMBER = '862';

export const mockMembers: Member[] = [
  // DeMolays - Diretoria
  { id: '1', name: 'Membro Exemplo 1', role: 'Mestre Conselheiro', category: 'demolays', order: 1 },
  { id: '2', name: 'Membro Exemplo 2', role: '1º Conselheiro', category: 'demolays', order: 2 },
  { id: '3', name: 'Membro Exemplo 3', role: '2º Conselheiro', category: 'demolays', order: 3 },
  // Secretaria
  { id: '4', name: 'Membro Exemplo 4', role: 'Escrivão', category: 'demolays', order: 4 },
  { id: '5', name: 'Membro Exemplo 5', role: 'Hospitaleiro', category: 'demolays', order: 5 },
  { id: '6', name: 'Membro Exemplo 6', role: 'Tesoureiro', category: 'demolays', order: 6 },
  // Outros membros
  { id: '7', name: 'Membro Exemplo 7', role: 'Orador', category: 'demolays', order: 7 },
  { id: '8', name: 'Membro Exemplo 8', role: '1º Diácono', category: 'demolays', order: 8 },
  // Sêniores
  { id: '9', name: 'Sênior Exemplo 1', role: 'Presidente', category: 'seniores', order: 1 },
  { id: '10', name: 'Sênior Exemplo 2', role: 'Vice-Presidente', category: 'seniores', order: 2 },
  { id: '11', name: 'Sênior Exemplo 3', role: 'Membro', category: 'seniores', order: 3 },
  // Consultores
  { id: '12', name: 'Consultor Exemplo 1', role: 'Presidente', category: 'consultores', order: 1 },
  { id: '13', name: 'Consultor Exemplo 2', role: 'Membro Organizador', category: 'consultores', order: 2 },
  { id: '14', name: 'Consultor Exemplo 3', role: 'Consultor', category: 'consultores', order: 3 },
  // Escudeiros
  { id: '15', name: 'Escudeiro Exemplo 1', role: 'Mestre Escudeiro', category: 'escudeiros', order: 1 },
  { id: '16', name: 'Escudeiro Exemplo 2', role: '1º Escudeiro', category: 'escudeiros', order: 2 },
  { id: '17', name: 'Escudeiro Exemplo 3', role: '2º Escudeiro', category: 'escudeiros', order: 3 },
  { id: '18', name: 'Escudeiro Exemplo 4', role: 'Escudeiro', category: 'escudeiros', order: 4 },
];

export const mockNews: News[] = [
  {
    id: '1',
    title: 'Bem-vindos ao novo site do Capítulo!',
    description: 'Estamos lançando nosso novo site oficial. Aqui você encontrará todas as informações sobre o Capítulo Cavaleiros do Guaporé nº 862, nossa história, membros e as últimas notícias.',
    images: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Cerimônia de Iniciação 2025',
    description: 'No último sábado, realizamos mais uma cerimônia de iniciação, onde novos membros foram recebidos em nossa Ordem. Foi uma noite memorável de fraternidade e compromisso.',
    images: [],
    createdAt: new Date().toISOString(),
  },
];

export const memberDescriptions = {
  demolays: {
    title: 'DeMolays',
    description: 'A Ordem DeMolay é uma organização fraternal internacional para jovens do sexo masculino, fundada em 1919 nos EUA. Os DeMolays são os membros ativos do Capítulo, responsáveis pela condução das reuniões ritualísticas, gestão administrativa e liderança juvenil. A diretoria é composta pelo Mestre Conselheiro, 1º e 2º Conselheiros. A secretaria inclui Escrivão, Hospitaleiro e Tesoureiro, além dos demais cargos cerimoniais.',
  },
  seniores: {
    title: 'Sêniores',
    description: 'Os Sêniores DeMolay são membros que completaram 21 anos e continuam vinculados à Ordem. O Conselho Sênior auxilia o Capítulo com experiência e orientação. O Presidente e Vice-Presidente dirigem este conselho, que oferece suporte aos DeMolays ativos em eventos, mentorias e atividades fraternas.',
  },
  consultores: {
    title: 'Conselho Consultivo',
    description: 'O Conselho Consultivo é formado por Sêniores DeMolay ou Maçons que orientam e aconselham o Capítulo. Os consultores podem ser Sêniores ou Maçons em geral, não necessariamente Mestres Maçons. O Presidente do Conselho e o Membro Organizador lideram este grupo, garantindo que a Ordem DeMolay mantenha seus laços com a Maçonaria e siga os princípios estabelecidos.',
  },
  escudeiros: {
    title: 'Escudeiros',
    description: 'Os Escudeiros são os aspirantes à Ordem DeMolay, em processo de preparação para a iniciação. O Mestre Escudeiro, 1º e 2º Escudeiros coordenam o grupo de candidatos, preparando-os para ingressar oficialmente no Capítulo através da cerimônia de iniciação.',
  },
};
