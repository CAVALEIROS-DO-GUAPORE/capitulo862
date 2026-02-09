import { CHAPTER_NAME, CHAPTER_NUMBER } from '@/data/mock';

export const metadata = {
  title: 'Termos de Uso | Cavaleiros do Guaporé nº 862',
  description: 'Termos de uso do site do Capítulo Cavaleiros do Guaporé nº 862.',
};

export default function TermosDeUsoPage() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-800 mb-2 text-center">
          Termos de Uso
        </h1>
        <p className="text-slate-600 text-center mb-8">
          Capítulo {CHAPTER_NAME} nº {CHAPTER_NUMBER}
        </p>
        <div className="prose prose-slate prose-lg max-w-none text-slate-600 space-y-6">
          <p>
            Ao acessar e utilizar o site do <strong className="text-blue-700">Capítulo {CHAPTER_NAME} nº {CHAPTER_NUMBER}</strong>,
            você concorda com os termos abaixo. Caso não concorde, solicitamos que não utilize o site.
          </p>

          <h2 className="text-2xl font-bold text-blue-800 mt-10">1. Uso do site</h2>
          <p>
            O site tem finalidade institucional: divulgação de atividades, notícias, membros e informações do
            Capítulo. O conteúdo é de uso informativo e não comercial. O uso do painel administrativo é restrito
            a usuários autorizados e está sujeito às regras internas do Capítulo.
          </p>

          <h2 className="text-2xl font-bold text-blue-800 mt-10">2. Conduta do usuário</h2>
          <p>
            É proibido utilizar o site para fins ilícitos, ofensivos ou que violem direitos de terceiros. Não
            é permitido tentar acessar áreas restritas sem autorização, nem interferir no funcionamento ou na
            segurança do sistema.
          </p>

          <h2 className="text-2xl font-bold text-blue-800 mt-10">3. Propriedade intelectual</h2>
          <p>
            Textos, imagens, logotipos e demais materiais publicados no site são de propriedade do Capítulo ou
            de titulares que autorizaram o uso. A reprodução não autorizada pode violar leis de direitos autorais.
          </p>

          <h2 className="text-2xl font-bold text-blue-800 mt-10">4. Links externos</h2>
          <p>
            O site pode conter links para redes sociais e páginas externas. Não nos responsabilizamos pelo
            conteúdo ou pelas práticas de privacidade de sites de terceiros.
          </p>

          <h2 className="text-2xl font-bold text-blue-800 mt-10">5. Alterações e contato</h2>
          <p>
            Estes termos podem ser alterados a qualquer momento. Dúvidas ou suporte: entre em contato pelo
            e-mail <a href="mailto:ordemdemolay862@gmail.com" className="text-blue-600 hover:underline">ordemdemolay862@gmail.com</a>.
          </p>

          <p className="text-slate-500 text-sm mt-10">
            Suporte: <a href="mailto:ordemdemolay862@gmail.com" className="text-blue-600 hover:underline">ordemdemolay862@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
