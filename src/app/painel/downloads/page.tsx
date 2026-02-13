'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const ROLES_PAUTAS = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao'];
/** Quem pode acessar a página de Downloads e baixar arquivos. Tesoureiro incluído. */
const ROLES_DOWNLOADS = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao', 'tesoureiro'];

const CATEGORIA_CANETA_OURO = 'Caneta de Ouro';
const CATEGORIA_CNIE = 'CNIE';
const CATEGORIA_CRN = 'CRN';

interface DownloadItem {
  id: string;
  label: string;
  description: string;
  endpoint: string;
  requiredRole?: string[];
  filename: string;
  category: string;
}

const DOWNLOADS: DownloadItem[] = [
  {
    id: 'pautas-frequencia',
    label: 'Pautas e Frequência (Excel)',
    description: 'Modelo em Excel para pautas e chamada de frequência.',
    endpoint: '/api/frequencia-modelo',
    requiredRole: ROLES_PAUTAS,
    filename: 'pautas_e_frequencia.xlsx',
    category: CATEGORIA_CANETA_OURO,
  },
  {
    id: 'relatorio-tesouraria',
    label: 'Relatório Tesouraria Geral',
    description: 'Modelo Excel com nomes e assinaturas do escrivão, mestre, presidente do conselho consultivo (PCC) e tesoureiro preenchidos automaticamente.',
    endpoint: '/api/downloads/relatorio-tesouraria-geral',
    filename: 'relatorio_tesouraria_geral.xlsx',
    category: CATEGORIA_CANETA_OURO,
  },
  {
    id: 'relatorio-expedientes-enviados',
    label: 'Relatório Expedientes e Enviados',
    description: 'Modelo Excel com nome e assinatura do escrivão em {nome_escrivao} e {assinatura_escrivao}.',
    endpoint: '/api/downloads/relatorio-expedientes-enviados',
    filename: 'relatorio_expedientes_e_enviados.xlsx',
    category: CATEGORIA_CANETA_OURO,
  },
  {
    id: 'relatorio-geral-hospitalaria',
    label: 'Relatório Geral Hospitalaria',
    description: 'Modelo Word com nomes e assinaturas do mestre, escrivão e hospitaleiro preenchidos automaticamente.',
    endpoint: '/api/downloads/relatorio-geral-hospitalaria',
    filename: 'relatorio_geral_hospitalaria.docx',
    category: CATEGORIA_CANETA_OURO,
  },
  {
    id: 'relatorio-geral-cnie',
    label: 'Relatório Geral CNIE',
    description: 'Modelo Word/Excel com nome do Mestre Conselheiro em {nome_mestre}.',
    endpoint: '/api/downloads/relatorio-geral-cnie',
    filename: 'relatorio_geral_cnie.docx',
    category: CATEGORIA_CNIE,
  },
  {
    id: 'relatorio-comissoes',
    label: 'Relatório Comissões',
    description: 'Modelo Word/Excel com nome do Mestre Conselheiro em {nome_mestre}.',
    endpoint: '/api/downloads/relatorio-comissoes',
    filename: 'relatorio_comissoes.docx',
    category: CATEGORIA_CNIE,
  },
  {
    id: 'planejamento-de-gestao',
    label: 'Planejamento de Gestão',
    description: 'Modelo Word/Excel com nome do Mestre Conselheiro em {nome_mestre}.',
    endpoint: '/api/downloads/planejamento-de-gestao',
    filename: 'planejamento_de_gestao.docx',
    category: CATEGORIA_CNIE,
  },
  {
    id: 'relatorio-arrecadacao-fundos',
    label: 'Relatório Arrecadação de Fundos',
    description: 'Modelo Word/Excel com nome do Mestre Conselheiro em {nome_mestre}.',
    endpoint: '/api/downloads/relatorio-arrecadacao-fundos',
    filename: 'relatorio_arrecadacao_fundos.docx',
    category: CATEGORIA_CNIE,
  },
  {
    id: 'relatorio-secretaria',
    label: 'Relatório Secretaria',
    description: 'Modelo Word com {nome_mestre} e {nome_escrivao} preenchidos automaticamente.',
    endpoint: '/api/downloads/relatorio-secretaria',
    filename: 'relatorio_secretaria.docx',
    category: CATEGORIA_CRN,
  },
  {
    id: 'relatorio-geral-crn',
    label: 'Relatório Geral CRN',
    description: 'Modelo Word com {nome_mestre} preenchido automaticamente.',
    endpoint: '/api/downloads/relatorio-geral-crn',
    filename: 'relatorio_geral_crn.docx',
    category: CATEGORIA_CRN,
  },
  {
    id: 'nominata-oficiais',
    label: 'Nominata Oficiais',
    description: 'Modelo Word com {nome_mestre} preenchido automaticamente.',
    endpoint: '/api/downloads/nominata-oficiais',
    filename: 'nominata_oficiais.docx',
    category: CATEGORIA_CRN,
  },
  {
    id: 'relatorio-semestral-crn',
    label: 'Relatório Semestral CRN',
    description: 'Modelo Excel com {nome_mestre}, {nome_tesoureiro} e {nome_pcc} preenchidos automaticamente.',
    endpoint: '/api/downloads/relatorio-semestral-crn',
    filename: 'relatorio_semestral_crn.xlsx',
    category: CATEGORIA_CRN,
  },
  {
    id: 'relatorio-arrecadacao-crn',
    label: 'Relatório Arrecadação CRN',
    description: 'Modelo Excel com {nome_mestre}, {nome_tesoureiro} e {nome_pcc} preenchidos automaticamente.',
    endpoint: '/api/downloads/relatorio-arrecadacao-crn',
    filename: 'relatorio_arrecadacao_crn.xlsx',
    category: CATEGORIA_CRN,
  },
];

const CATEGORIAS = [CATEGORIA_CANETA_OURO, CATEGORIA_CNIE, CATEGORIA_CRN] as const;
type CategoriaFiltro = typeof CATEGORIAS[number] | 'Todos';

export default function DownloadsPage() {
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaFiltro>(CATEGORIA_CANETA_OURO);
  const categoriasList: CategoriaFiltro[] = [CATEGORIA_CANETA_OURO, CATEGORIA_CNIE, CATEGORIA_CRN, 'Todos'];
  const router = useRouter();

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    } else {
      router.replace('/painel');
    }
    setLoading(false);
  }, [router]);

  const itensFiltrados =
    categoriaFiltro === 'Todos'
      ? DOWNLOADS
      : DOWNLOADS.filter((d) => d.category === categoriaFiltro);

  async function handleDownload(item: DownloadItem) {
    const required = item.requiredRole;
    if (required?.length && user && !required.includes(user.role)) {
      alert('Você não tem permissão para baixar este arquivo.');
      return;
    }
    try {
      const res = await fetch(item.endpoint, {
        headers: await getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao baixar.');
    }
  }

  async function getAuthHeaders(): Promise<HeadersInit> {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const headers: HeadersInit = {};
    if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  function canDownload(item: DownloadItem): boolean {
    if (!item.requiredRole?.length) return true;
    return !!user && item.requiredRole.includes(user.role);
  }

  const canAccessDownloads = user?.role && ROLES_DOWNLOADS.includes(user.role);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <p className="text-slate-600">Carregando...</p>
      </div>
    );
  }

  if (!canAccessDownloads) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-blue-800 mb-2">Downloads</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 flex items-center gap-3">
          <LockIcon />
          <div>
            <p className="text-amber-800 font-medium">Acesso restrito</p>
            <p className="text-amber-700 text-sm mt-1">
              Apenas cargos com permissão (Mestre Conselheiro, 1º Conselheiro, Escrivão, Tesoureiro e Admin) podem acessar os downloads.
            </p>
            <Link href="/painel/secretaria" className="inline-block mt-3 text-amber-800 font-medium hover:underline text-sm">
              ← Voltar à Secretaria
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-blue-800 mb-2">Downloads</h1>
      <p className="text-slate-600 mb-4">
        Arquivos e modelos disponíveis para download. Alguns são restritos por cargo.
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-600">Categoria:</span>
        <div className="flex flex-wrap gap-2">
          {categoriasList.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoriaFiltro(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                categoriaFiltro === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {itensFiltrados.map((item) => {
          const allowed = canDownload(item);
          return (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-lg border border-slate-200"
            >
              <div>
                <h2 className="font-semibold text-slate-800">{item.label}</h2>
                <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                {item.requiredRole && !allowed && (
                  <p className="text-sm text-amber-600 mt-1">
                    Disponível apenas para: Escrivão, Mestre Conselheiro, 1º Conselheiro e Admin.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDownload(item)}
                disabled={!allowed}
                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  allowed
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                }`}
              >
                Baixar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-amber-600">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
