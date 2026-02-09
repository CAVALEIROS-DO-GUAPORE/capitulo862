import { CHAPTER_NAME, CHAPTER_NUMBER } from '@/data/mock';

export const metadata = {
  title: 'Termo de Privacidade | Cavaleiros do Guaporé nº 862',
  description: 'Política de privacidade e proteção de dados do Capítulo Cavaleiros do Guaporé nº 862.',
};

export default function PrivacidadePage() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-blue-800 mb-2 text-center">
          Termo de Privacidade
        </h1>
        <p className="text-slate-600 text-center mb-8">
          Capítulo {CHAPTER_NAME} nº {CHAPTER_NUMBER}
        </p>
        <div className="prose prose-slate prose-lg max-w-none text-slate-600 space-y-6">
          <p>
            O <strong className="text-blue-700">Capítulo {CHAPTER_NAME} nº {CHAPTER_NUMBER}</strong> está
            comprometido com a proteção da privacidade dos visitantes e usuários deste site. Este termo descreve
            como coletamos, usamos e protegemos suas informações.
          </p>

          <h2 className="text-2xl font-bold text-blue-800 mt-10">1. Informações que coletamos</h2>
          <p>
            Podemos coletar dados que você nos fornece diretamente (nome, e-mail, telefone) ao preencher
            formulários, candidaturas ou ao entrar em contato conosco. No painel administrativo, são armazenados
            dados de perfil (nome, e-mail, foto) dos usuários autorizados.
          </p>

          <h2 className="text-2xl font-bold text-blue-800 mt-10">2. Uso das informações</h2>
          <p>
            As informações são utilizadas para gestão do Capítulo, comunicação institucional, processamento de
            candidaturas e acesso ao painel interno. Não vendemos nem compartilhamos seus dados com terceiros
            para fins comerciais.
          </p>

          <h2 className="text-2xl font-bold text-blue-800 mt-10">3. Segurança e armazenamento</h2>
          <p>
            Utilizamos medidas técnicas adequadas para proteger seus dados. O armazenamento é feito em
            infraestrutura segura (Supabase e provedores associados), em conformidade com boas práticas de
            segurança.
          </p>

          <h2 className="text-2xl font-bold text-blue-800 mt-10">4. Seus direitos</h2>
          <p>
            Você pode solicitar acesso, correção ou exclusão dos seus dados pessoais entrando em contato pelo
            e-mail <a href="mailto:ordemdemolay862@gmail.com" className="text-blue-600 hover:underline">ordemdemolay862@gmail.com</a>.
          </p>

          <h2 className="text-2xl font-bold text-blue-800 mt-10">5. Alterações</h2>
          <p>
            Este termo de privacidade pode ser atualizado. A data da última revisão será indicada na página.
            O uso continuado do site após alterações constitui aceitação das novas condições.
          </p>

          <p className="text-slate-500 text-sm mt-10">
            Dúvidas sobre privacidade? Entre em contato:{' '}
            <a href="mailto:ordemdemolay862@gmail.com" className="text-blue-600 hover:underline">ordemdemolay862@gmail.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
