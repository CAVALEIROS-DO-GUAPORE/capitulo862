'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDialogs } from '@/components/DialogsProvider';
import { canAccessSecretariaDownloads } from '@/lib/panel-permissions';
import { CANDIDATURA_DOWNLOAD_DEFS } from '@/lib/candidaturas-downloads';
import { CERIMONIA_DOWNLOAD_DEFS } from '@/lib/cerimonias-downloads';
import type { Edital } from '@/types';

const CATEGORIA_CANETA_OURO = 'Caneta de Ouro';
const CATEGORIA_CNIE = 'CNIE';
const CATEGORIA_CRN = 'CRN';
const CATEGORIA_EDITAIS = 'Editais';
const CATEGORIA_CERIMONIAS = 'Cerimônias';
const CATEGORIA_CANDIDATURAS = 'Candidaturas';

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
    id: 'modelo-oficio-original',
    label: 'Modelo de Ofício/Convite (Word)',
    description: 'Arquivo original (sem preenchimento automático) para edição manual.',
    endpoint: '/api/downloads/modelo-oficio',
    filename: 'modelo_oficio.docx',
    category: CATEGORIA_CANETA_OURO,
  },
  {
    id: 'pautas-frequencia',
    label: 'Pautas e Frequência (Excel)',
    description: 'Modelo em Excel para pautas e chamada de frequência.',
    endpoint: '/api/frequencia-modelo',
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
  ...CANDIDATURA_DOWNLOAD_DEFS.map((doc) => ({
    id: doc.slug,
    label: doc.label,
    description: doc.description,
    endpoint: `/api/downloads/candidaturas/${doc.slug}`,
    filename: doc.downloadFilename,
    category: CATEGORIA_CANDIDATURAS,
  })),
  ...CERIMONIA_DOWNLOAD_DEFS.map((c) => ({
    id: c.slug,
    label: c.label,
    description: c.description,
    endpoint: `/api/downloads/cerimonias/${c.slug}`,
    filename: c.downloadFilename,
    category: CATEGORIA_CERIMONIAS,
  })),
];

const CATEGORIAS = [
  CATEGORIA_CANETA_OURO,
  CATEGORIA_CNIE,
  CATEGORIA_CRN,
  CATEGORIA_EDITAIS,
  CATEGORIA_CERIMONIAS,
  CATEGORIA_CANDIDATURAS,
] as const;
type CategoriaFiltro = typeof CATEGORIAS[number] | 'Todos';

export default function DownloadsPage() {
  const { confirm, toast } = useDialogs();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaFiltro>(CATEGORIA_CANETA_OURO);
  const [editais, setEditais] = useState<Edital[]>([]);
  const [editaisLoading, setEditaisLoading] = useState(false);
  const [canManageEditais, setCanManageEditais] = useState(false);
  const [showEditalForm, setShowEditalForm] = useState(false);
  const [savingEdital, setSavingEdital] = useState(false);
  const [editalForm, setEditalForm] = useState({ title: '', description: '', pdf: null as File | null });
  const [downloadingEditalId, setDownloadingEditalId] = useState<string | null>(null);
  const categoriasList: CategoriaFiltro[] = [
    CATEGORIA_CANETA_OURO,
    CATEGORIA_CNIE,
    CATEGORIA_CRN,
    CATEGORIA_EDITAIS,
    CATEGORIA_CERIMONIAS,
    CATEGORIA_CANDIDATURAS,
    'Todos',
  ];
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

  const loadEditais = useCallback(async () => {
    setEditaisLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/editais', { headers, credentials: 'include' });
      const data = await res.json();
      setEditais(res.ok && Array.isArray(data) ? data : []);
    } catch {
      setEditais([]);
    } finally {
      setEditaisLoading(false);
    }
  }, []);

  const loadEditalAccess = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/editais/access', { headers, credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCanManageEditais(!!data.canManage);
      }
    } catch {
      setCanManageEditais(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadEditais();
    loadEditalAccess();
  }, [user, loadEditais, loadEditalAccess]);

  const showEditaisSection =
    categoriaFiltro === CATEGORIA_EDITAIS || categoriaFiltro === 'Todos';

  const itensFiltrados =
    categoriaFiltro === 'Todos'
      ? DOWNLOADS
      : categoriaFiltro === CATEGORIA_EDITAIS
        ? []
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

  async function handleDownloadEdital(edital: Edital) {
    setDownloadingEditalId(edital.id);
    try {
      const res = await fetch(`/api/editais/${edital.id}/download`, {
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
      a.download = edital.pdfFileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao baixar edital.', 'error');
    } finally {
      setDownloadingEditalId(null);
    }
  }

  async function handlePublishEdital(e: React.FormEvent) {
    e.preventDefault();
    if (!editalForm.title.trim()) {
      toast('Informe o título do edital', 'error');
      return;
    }
    if (!editalForm.pdf) {
      toast('Selecione o arquivo PDF', 'error');
      return;
    }

    setSavingEdital(true);
    try {
      const formData = new FormData();
      formData.append('title', editalForm.title.trim());
      formData.append('description', editalForm.description.trim());
      formData.append('pdf', editalForm.pdf);

      const headers = await getAuthHeaders();
      const res = await fetch('/api/editais', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao publicar edital');

      toast('Edital publicado!');
      setEditalForm({ title: '', description: '', pdf: null });
      setShowEditalForm(false);
      loadEditais();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao publicar edital', 'error');
    } finally {
      setSavingEdital(false);
    }
  }

  async function handleDeleteEdital(edital: Edital) {
    const ok = await confirm({
      message: `Excluir o edital "${edital.title}"?`,
      danger: true,
      confirmLabel: 'Excluir',
    });
    if (!ok) return;

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/editais/${edital.id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir');
      toast('Edital excluído');
      loadEditais();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir edital', 'error');
    }
  }

  const canAccessDownloads = canAccessSecretariaDownloads(user?.role);

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
              Apenas membros ativos do painel (DeMolays, Sêniores e Consultores) podem acessar os downloads.
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
        Arquivos e modelos disponíveis para todos os membros do painel.
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
        {itensFiltrados.length === 0 && !showEditaisSection ? (
          <p className="py-10 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
            Nenhum arquivo disponível em <strong className="text-slate-700">{categoriaFiltro}</strong> no momento.
          </p>
        ) : (
          itensFiltrados.map((item) => {
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
          })
        )}

        {showEditaisSection && (
          <div className={itensFiltrados.length > 0 ? 'pt-4 border-t border-slate-200' : ''}>
            {categoriaFiltro === 'Todos' && (
              <h2 className="text-lg font-bold text-blue-800 mb-4">Editais</h2>
            )}

            {canManageEditais && (
              <div className="mb-4">
                {!showEditalForm ? (
                  <button
                    type="button"
                    onClick={() => setShowEditalForm(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                  >
                    + Novo edital
                  </button>
                ) : (
                  <form
                    onSubmit={handlePublishEdital}
                    className="bg-white rounded-lg border border-slate-200 p-5 space-y-4"
                  >
                    <h3 className="font-semibold text-slate-800">Publicar edital</h3>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Título *</span>
                      <input
                        required
                        value={editalForm.title}
                        onChange={(e) => setEditalForm({ ...editalForm, title: e.target.value })}
                        className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                        placeholder="Ex.: Edital de Atividades Mensais — Março/2026"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Descrição</span>
                      <textarea
                        value={editalForm.description}
                        onChange={(e) => setEditalForm({ ...editalForm, description: e.target.value })}
                        className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                        rows={3}
                        placeholder="Resumo ou observações sobre o edital"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">Arquivo PDF *</span>
                      <input
                        required
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(e) =>
                          setEditalForm({ ...editalForm, pdf: e.target.files?.[0] ?? null })
                        }
                        className="mt-1 w-full text-sm"
                      />
                      <span className="text-xs text-slate-500 mt-1 block">Máximo 15 MB</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        disabled={savingEdital}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                      >
                        {savingEdital ? 'Publicando...' : 'Publicar edital'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditalForm(false);
                          setEditalForm({ title: '', description: '', pdf: null });
                        }}
                        className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {editaisLoading ? (
              <p className="text-slate-500 text-sm py-6 text-center">Carregando editais...</p>
            ) : editais.length === 0 ? (
              <p className="py-10 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
                Nenhum edital publicado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {editais.map((edital) => (
                  <div
                    key={edital.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-lg border border-slate-200"
                  >
                    <div>
                      <h3 className="font-semibold text-slate-800">{edital.title}</h3>
                      {edital.description && (
                        <p className="text-sm text-slate-500 mt-1 whitespace-pre-wrap">{edital.description}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        Publicado em{' '}
                        {new Date(edital.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDownloadEdital(edital)}
                        disabled={downloadingEditalId === edital.id}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                      >
                        {downloadingEditalId === edital.id ? 'Baixando...' : 'Baixar PDF'}
                      </button>
                      {canManageEditais && (
                        <button
                          type="button"
                          onClick={() => handleDeleteEdital(edital)}
                          className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
