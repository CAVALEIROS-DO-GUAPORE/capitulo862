import Link from 'next/link';

const SUPPORT_EMAIL = 'ordemdemolay862@gmail.com';
const INSTAGRAM_CHAPTER = 'https://instagram.com/capitulo862';
const INSTAGRAM_ALUMNI = 'https://instagram.com/colegio_alumni';

export default function Footer() {
  return (
    <footer className="bg-blue-900 text-white border-t border-blue-800 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="font-bold text-blue-100">Capítulo Cavaleiros do Guaporé nº 862</p>
            <p className="text-blue-200 text-sm">Ordem DeMolay - Fraternidade, Reverência e Companheirismo</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-4 md:gap-6 text-blue-200 text-sm">
            <Link href="/" className="hover:text-white transition-colors">Início</Link>
            <Link href="/sobre" className="hover:text-white transition-colors">Sobre</Link>
            <Link href="/membros" className="hover:text-white transition-colors">Membros</Link>
            <Link href="/noticias" className="hover:text-white transition-colors">Notícias</Link>
            <Link href="/privacidade" className="hover:text-white transition-colors">Privacidade</Link>
            <Link href="/termos-de-uso" className="hover:text-white transition-colors">Termos de Uso</Link>
          </nav>
        </div>
        <div className="mt-6 pt-6 border-t border-blue-800 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-6 text-blue-200 text-sm">
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white transition-colors">
            Suporte: {SUPPORT_EMAIL}
          </a>
          <span className="hidden sm:inline text-blue-600">|</span>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={INSTAGRAM_CHAPTER}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              @capitulo862
            </a>
            <a
              href={INSTAGRAM_ALUMNI}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
              title="Colégio Alumni Guardiões do Guaporé nº 378"
            >
              @colegio_alumni
            </a>
          </div>
        </div>
        <p className="text-blue-300 text-sm text-center mt-4">
          © {new Date().getFullYear()} Cavaleiros do Guaporé nº 862. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
