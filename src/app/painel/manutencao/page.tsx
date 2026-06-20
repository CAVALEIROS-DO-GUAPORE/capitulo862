'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatReturnDateTime } from '@/lib/maintenance-settings';

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

export default function PainelManutencaoPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ role?: string } | null>(null);
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [description, setDescription] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [returnTime, setReturnTime] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingToggle, setSavingToggle] = useState(false);
  const [savingContent, setSavingContent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        if (parsed.role !== 'admin') {
          router.replace('/painel');
        }
      } catch {
        router.replace('/painel');
      }
    } else {
      router.replace('/login');
    }
  }, [router]);

  useEffect(() => {
    if (user?.role !== 'admin') return;

    async function loadStatus() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/settings/maintenance');
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Não foi possível carregar o status');
        }
        const data = await res.json();
        setMaintenanceEnabled(data.maintenanceEnabled === true);
        setDescription(data.description ?? '');
        setReturnDate(data.returnDate ?? '');
        setReturnTime(data.returnTime ?? '');
        setUpdatedAt(data.updatedAt ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar');
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, [user?.role]);

  async function handleToggle() {
    setSavingToggle(true);
    setError('');
    setSuccess('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/settings/maintenance', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ enabled: !maintenanceEnabled }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível atualizar');
      }
      setMaintenanceEnabled(data.maintenanceEnabled === true);
      setUpdatedAt(data.updatedAt ?? null);
      setSuccess(
        data.maintenanceEnabled
          ? 'Modo manutenção ativado. Apenas administradores podem acessar o site.'
          : 'Modo manutenção desativado. O site está público novamente.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSavingToggle(false);
    }
  }

  async function handleSaveContent(e: React.FormEvent) {
    e.preventDefault();
    setSavingContent(true);
    setError('');
    setSuccess('');
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/settings/maintenance', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          description: description.trim() || null,
          returnDate: returnDate || null,
          returnTime: returnTime || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Não foi possível salvar');
      }
      setDescription(data.description ?? '');
      setReturnDate(data.returnDate ?? '');
      setReturnTime(data.returnTime ?? '');
      setUpdatedAt(data.updatedAt ?? null);
      setSuccess('Mensagem da página de manutenção atualizada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSavingContent(false);
    }
  }

  const previewReturn = formatReturnDateTime(returnDate || null, returnTime || null);

  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-600">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-blue-800 mb-2">Manutenção do site</h1>
      <p className="text-slate-600 mb-8">
        Ative o modo manutenção para exibir uma página temporária aos visitantes.
        Enquanto estiver ativo, somente o administrador pode fazer login e navegar pelo site para testes.
      </p>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
        {loading ? (
          <p className="text-slate-600">Carregando status...</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <p className="font-semibold text-slate-800">
                  Status atual:{' '}
                  <span className={maintenanceEnabled ? 'text-amber-600' : 'text-green-600'}>
                    {maintenanceEnabled ? 'Em manutenção' : 'Site público'}
                  </span>
                </p>
                {updatedAt && (
                  <p className="text-slate-500 text-sm mt-1">
                    Última alteração:{' '}
                    {new Date(updatedAt).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleToggle}
                disabled={savingToggle}
                className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                  maintenanceEnabled ? 'bg-amber-500' : 'bg-slate-300'
                }`}
                aria-pressed={maintenanceEnabled}
                aria-label={maintenanceEnabled ? 'Desativar manutenção' : 'Ativar manutenção'}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                    maintenanceEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-600 space-y-2">
              <p>
                <strong className="text-slate-800">Quando ativado:</strong> visitantes veem a página de manutenção e não conseguem fazer login.
              </p>
              <p>
                <strong className="text-slate-800">Como admin:</strong> você continua acessando o site normalmente para validar alterações antes de reabrir ao público.
              </p>
            </div>
          </>
        )}
      </div>

      <form onSubmit={handleSaveContent} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div>
          <h2 className="font-semibold text-slate-800 mb-1">Mensagem para visitantes</h2>
          <p className="text-slate-500 text-sm mb-4">
            Texto exibido na página de manutenção, junto com a previsão de retorno.
          </p>
          <label htmlFor="description" className="block text-slate-700 text-sm mb-1">
            Descrição
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Ex.: Estamos atualizando o site com novidades. Em breve estaremos de volta!"
            className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="returnDate" className="block text-slate-700 text-sm mb-1">
              Data de retorno
            </label>
            <input
              id="returnDate"
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label htmlFor="returnTime" className="block text-slate-700 text-sm mb-1">
              Hora de retorno
            </label>
            <input
              id="returnTime"
              type="time"
              value={returnTime}
              onChange={(e) => setReturnTime(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {previewReturn && (
          <p className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 capitalize">
            Prévia: Previsão de retorno — {previewReturn}
          </p>
        )}

        <button
          type="submit"
          disabled={savingContent || loading}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
        >
          {savingContent ? 'Salvando...' : 'Salvar mensagem'}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm mt-4">{error}</p>}
      {success && <p className="text-green-700 text-sm mt-4">{success}</p>}
    </div>
  );
}
