import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-blue-900 text-white border-t border-blue-800 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="font-bold text-blue-100">Capítulo Cavaleiros do Guaporé nº 862</p>
            <p className="text-blue-200 text-sm">Ordem DeMolay - Fraternidade, Reverência e Companheirismo</p>
          </div>
          <nav className="flex gap-6 text-blue-200">
            <Link href="/" className="hover:text-white transition-colors">Início</Link>
            <Link href="/sobre" className="hover:text-white transition-colors">Sobre</Link>
            <Link href="/membros" className="hover:text-white transition-colors">Membros</Link>
            <Link href="/noticias" className="hover:text-white transition-colors">Notícias</Link>
          </nav>
        </div>
        <p className="text-blue-300 text-sm text-center mt-6">
          © {new Date().getFullYear()} Cavaleiros do Guaporé nº 862. Todos os direitos reservados.
        </p>
      </div>
    </footer>
  );
}
