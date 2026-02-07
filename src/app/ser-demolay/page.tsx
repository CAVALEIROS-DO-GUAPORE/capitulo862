import Link from 'next/link';
import CandidaturaForm from '@/components/CandidaturaForm';

export default function SerDemolayPage() {
  return (
    <div className="py-12 px-4 min-h-[60vh]">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-blue-600 hover:underline mb-8"
        >
          ← Voltar ao início
        </Link>
        <h1 className="text-3xl font-bold text-blue-800 mb-2 text-center">
          Quer ser DeMolay?
        </h1>
        <p className="text-slate-600 text-center mb-10">
          Preencha sua ficha cadastral. O Mestre Conselheiro e o 1º Conselheiro serão notificados.
        </p>
        <CandidaturaForm />
      </div>
    </div>
  );
}
