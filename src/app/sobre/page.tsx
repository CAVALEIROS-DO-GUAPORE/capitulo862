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
            O <strong>Capítulo Cavaleiros do Guaporé nº 862</strong> nasceu em <strong>2014</strong>, 
            na região do Vale do Guaporé, inspirado pelo rio que dá nome à nossa terra e pela bravura 
            dos cavaleiros que, ao longo dos séculos, defenderam honra e fraternidade. Um grupo de 
            jovens visionários, apoiados por tios maçons dedicados, uniu-se com um propósito: formar 
            uma geração de líderes íntegros, conscientes e comprometidos com o bem comum.
          </p>
          <p>
            Desde a fundação, passamos por momentos marcantes: cerimônias de instalação, conquistas 
            em competições regionais, projetos sociais em parceria com a comunidade e a criação do 
            Castelo dos Escudeiros, ampliando nosso alcance para meninos dos 7 aos 11 anos. 
            Crescemos em número e, acima de tudo, em união — cada gestão deixou sua contribuição 
            para que hoje sejamos uma família fortalecida pela amizade e pelos valores demolei.
          </p>
          <p>
            Hoje seguimos escrevendo nossa história com cerimônias ritualísticas, eventos sociais, 
            ações comunitárias e o cultivo diário da fraternidade entre irmãos. O Capítulo 862 
            permanece como um farol de esperança e formação para a juventude da região.
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
