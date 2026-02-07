import Link from 'next/link';

export default function PainelPage() {
  const cards = [
    { href: '/painel/membros', label: 'Membros', desc: 'Gerir membros e cargos' },
    { href: '/painel/noticias', label: 'Notícias', desc: 'Publicar notícias' },
    { href: '/painel/calendario', label: 'Calendário', desc: 'Eventos e ritualísticas' },
    { href: '/painel/atas', label: 'Atas', desc: 'Atas internas' },
    { href: '/painel/financas', label: 'Finanças', desc: 'Caixa e prestação de contas' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-800 mb-6">
        Painel do Capítulo
      </h1>
      <p className="text-slate-600 mb-8">
        Bem-vindo à área interna. Selecione uma opção abaixo.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block p-6 bg-white rounded-xl border border-slate-200 hover:border-blue-400 shadow-sm transition-colors"
          >
            <h2 className="font-bold text-blue-800 mb-1">{card.label}</h2>
            <p className="text-slate-600 text-sm">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
