import { CHAPTER_NAME, CHAPTER_NUMBER } from '@/data/mock';

export default function SobrePage() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-800 mb-8 text-center">
          Sobre Nós
        </h1>
        <div className="prose prose-slate prose-lg max-w-none text-slate-600 space-y-6">
          <p>
            O <strong className="text-blue-700">Capítulo {CHAPTER_NAME} nº {CHAPTER_NUMBER}</strong> é uma 
            comunidade de jovens dedicados aos valores da Ordem DeMolay e ao serviço à sociedade.
          </p>
          <h2 className="text-2xl font-bold text-blue-800 mt-10">Nossa História</h2>
          <p>
            [Aqui será inserida a história breve do Capítulo Cavaleiros do Guaporé nº 862. 
            Esta seção deve ser preenchida pelos membros com os principais marcos, fundação, 
            eventos históricos e conquistas do Capítulo.]
          </p>
          <p>
            O Capítulo foi fundado com o objetivo de formar jovens de caráter, desenvolvendo 
            líderes através dos princípios da Ordem DeMolay. Nossas atividades incluem 
            cerimônias ritualísticas, eventos sociais, ações comunitárias e o cultivo da 
            fraternidade entre os irmãos.
          </p>
          <h2 className="text-2xl font-bold text-blue-800 mt-10">Nossa Missão</h2>
          <p>
            Desenvolver jovens líderes, fortalecendo valores como amor filial, reverência, 
            cortesia, companheirismo, fidelidade, pureza e patriotismo. Construir uma 
            comunidade fraterna onde cada membro possa crescer e contribuir para um mundo melhor.
          </p>
        </div>
      </div>
    </div>
  );
}
