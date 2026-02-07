import Link from 'next/link';
import { CHAPTER_NAME, CHAPTER_NUMBER } from '@/data/mock';

export default function HomePage() {
  return (
    <div>
      <section className="relative py-20 px-4 bg-gradient-to-b from-blue-800 to-blue-900">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Cavaleiros do Guaporé nº {CHAPTER_NUMBER}
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            Ordem DeMolay · Fraternidade, Reverência e Companheirismo
          </p>
          <Link
            href="/ser-demolay"
            className="inline-block px-8 py-4 bg-white hover:bg-blue-50 text-blue-800 font-bold rounded-lg transition-colors text-lg"
          >
            SER DEMOLAY
          </Link>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-blue-800 mb-8 text-center">
            A Ordem DeMolay
          </h2>
          <div className="prose prose-slate prose-lg max-w-none text-slate-600 space-y-6">
            <p>
              A <strong className="text-blue-700">Ordem DeMolay</strong> é uma organização fraternal internacional 
              voltada para jovens do sexo masculino entre 12 e 21 anos, fundada em 18 de março de 1919 em Kansas City, 
              Missouri, Estados Unidos, por Frank S. Land.
            </p>
            <p>
              O nome da Ordem homenageia Jacques DeMolay, o último Grão-Mestre dos Cavaleiros Templários, 
              que foi executado em 1314 por se recusar a trair seus irmãos. DeMolay personifica a lealdade, 
              a honra e a integridade que a Ordem busca desenvolver em seus membros.
            </p>
            <p>
              Nossos sete princípios cardeais são: <strong>Amor Filial</strong>, <strong>Reverência pelas Coisas Sagradas</strong>, 
              <strong> Cortesia</strong>, <strong>Companheirismo</strong>, <strong>Fidelidade</strong>, 
              <strong> Pureza</strong> e <strong>Patriotismo</strong>. Através de cerimônias, eventos sociais 
              e atividades comunitárias, os DeMolays desenvolvem liderança, caráter e cidadania.
            </p>
            <p>
              O <strong className="text-blue-700">Capítulo {CHAPTER_NAME} nº {CHAPTER_NUMBER}</strong> faz parte dessa 
              tradição centenária, reunindo jovens comprometidos com os valores da Ordem e o desenvolvimento 
              de nossa comunidade.
            </p>
          </div>
          <div className="mt-12 flex flex-wrap gap-4 justify-center">
            <Link
              href="/membros"
              className="px-6 py-3 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg font-bold transition-colors"
            >
              Nossos Membros
            </Link>
            <Link
              href="/noticias"
              className="px-6 py-3 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg font-bold transition-colors"
            >
              Últimas Notícias
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-slate-100">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-blue-800 mb-4">
            Instale nosso app no seu celular
          </h2>
          <p className="text-slate-600 mb-6">
            Acesse rapidamente o site do Capítulo. No navegador do seu celular, toque no ícone de compartilhar 
            ou menu e selecione &quot;Adicionar à tela inicial&quot; para instalar como app.
          </p>
          <div className="flex justify-center gap-2 text-sm text-slate-500">
            <span>📱 Chrome / Edge: Menu → Instalar app</span>
          </div>
        </div>
      </section>
    </div>
  );
}
