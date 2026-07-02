'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useDialogs } from '@/components/DialogsProvider';
import { PanelAccessGate } from '@/components/PanelAccessGate';
import { canViewRaffles } from '@/lib/panel-permissions';
import type { Raffle, RaffleSoldNumber } from '@/types';
import {
  formatBuyerName,
  formatBuyerNameInput,
  formatCurrency,
  formatDrawDate,
  qrCodeUrl,
} from '@/lib/raffles-utils';
import { MAX_NUMBERS_PER_SALE } from '@/lib/raffles-security';

async function getAuthHeaders(json = false): Promise<HeadersInit> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: HeadersInit = json ? { 'Content-Type': 'application/json' } : {};
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

type PanelView = 'list' | 'create' | 'sell';

interface RaffleDetail extends Raffle {
  soldNumbers: RaffleSoldNumber[];
}

const EMPTY_FORM = {
  title: '',
  description: '',
  pricePerNumber: '',
  prizes: [''],
  drawAt: '',
  whatsappContact: '',
  pixKey: '',
  totalNumbers: '100',
  bannerUrl: '',
};

export default function PainelRifasPage() {
  const { confirm, toast } = useDialogs();
  const [user, setUser] = useState<{ role: string } | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<PanelView>('list');
  const [selectedRaffle, setSelectedRaffle] = useState<RaffleDetail | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [saleForm, setSaleForm] = useState({
    buyerName: '',
    buyerPhone: '',
    buyerPhoneExtra: '',
    selectedNumbers: [] as number[],
    receipt: null as File | null,
  });
  const [selling, setSelling] = useState(false);
  const [showPix, setShowPix] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('dm_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
  }, []);

  const loadAccess = useCallback(async () => {
    const headers = await getAuthHeaders();
    const res = await fetch('/api/raffles/access', { headers, credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setCanManage(!!data.canManage);
    }
  }, []);

  const loadRaffles = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/raffles', { headers, credentials: 'include' });
      const data = await res.json();
      setRaffles(res.ok && Array.isArray(data) ? data : []);
    } catch {
      setRaffles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRaffleDetail = useCallback(async (id: string) => {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/raffles/${id}`, { headers, credentials: 'include' });
    if (!res.ok) throw new Error('Erro ao carregar sorteio');
    return (await res.json()) as RaffleDetail;
  }, []);

  useEffect(() => {
    loadAccess();
    loadRaffles();
  }, [loadAccess, loadRaffles]);

  const selectedRaffleIdRef = useRef<string | null>(null);
  selectedRaffleIdRef.current = selectedRaffle?.id ?? null;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('raffles-panel-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'raffle_sale_numbers' },
        () => {
          loadRaffles();
          const id = selectedRaffleIdRef.current;
          if (id) {
            loadRaffleDetail(id)
              .then(setSelectedRaffle)
              .catch(() => {});
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadRaffles, loadRaffleDetail]);

  const soldSet = useMemo(
    () => new Set(selectedRaffle?.soldNumbers.map((s) => s.number) ?? []),
    [selectedRaffle]
  );

  const totalSale = useMemo(() => {
    if (!selectedRaffle) return 0;
    return saleForm.selectedNumbers.length * selectedRaffle.pricePerNumber;
  }, [selectedRaffle, saleForm.selectedNumbers]);

  useEffect(() => {
    setSaleForm((prev) => {
      const stillAvailable = prev.selectedNumbers.filter((n) => !soldSet.has(n));
      if (stillAvailable.length === prev.selectedNumbers.length) return prev;
      toast('Alguns números selecionados acabaram de ser vendidos por outro irmão.', 'error');
      return { ...prev, selectedNumbers: stillAvailable };
    });
  }, [soldSet, toast]);

  function resetCreateForm() {
    setForm(EMPTY_FORM);
    setBannerUploading(false);
    setError('');
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerUploading(true);
    setError('');
    try {
      const headers = await getAuthHeaders();
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/raffles/upload', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar banner');
      setForm((f) => ({ ...f, bannerUrl: data.url }));
      toast('Banner enviado!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar banner');
    } finally {
      setBannerUploading(false);
      e.target.value = '';
    }
  }

  function resetSaleForm() {
    setSaleForm({
      buyerName: '',
      buyerPhone: '',
      buyerPhoneExtra: '',
      selectedNumbers: [],
      receipt: null,
    });
    setShowPix(false);
    setError('');
  }

  async function openSell(raffle: Raffle) {
    try {
      const detail = await loadRaffleDetail(raffle.id);
      setSelectedRaffle(detail);
      resetSaleForm();
      setView('sell');
    } catch {
      toast('Erro ao abrir venda', 'error');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const headers = await getAuthHeaders(true);
      const prizes = form.prizes.map((p) => p.trim()).filter(Boolean);
      const res = await fetch('/api/raffles', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          pricePerNumber: Number(form.pricePerNumber),
          prizes,
          drawAt: new Date(form.drawAt).toISOString(),
          whatsappContact: form.whatsappContact,
          pixKey: form.pixKey,
          totalNumbers: Number(form.totalNumbers) || 100,
          bannerUrl: form.bannerUrl || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar sorteio');
      toast('Sorteio cadastrado com sucesso!');
      resetCreateForm();
      setView('list');
      loadRaffles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar sorteio');
    } finally {
      setSaving(false);
    }
  }

  async function handleCloseRaffle(raffle: Raffle) {
    const ok = await confirm({
      message: 'Encerrar este sorteio? Ele deixará de aparecer no site público.',
    });
    if (!ok) return;
    const headers = await getAuthHeaders(true);
    const res = await fetch(`/api/raffles/${raffle.id}`, {
      method: 'PATCH',
      headers,
      credentials: 'include',
      body: JSON.stringify({ status: 'closed' }),
    });
    if (res.ok) {
      toast('Sorteio encerrado');
      loadRaffles();
    } else {
      toast('Erro ao encerrar sorteio', 'error');
    }
  }

  async function handleDeleteRaffle(raffle: Raffle) {
    const ok = await confirm({
      message: 'Excluir este sorteio permanentemente? Todas as vendas serão apagadas.',
      danger: true,
      confirmLabel: 'Excluir',
    });
    if (!ok) return;
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/raffles/${raffle.id}`, {
      method: 'DELETE',
      headers,
      credentials: 'include',
    });
    if (res.ok) {
      toast('Sorteio excluído');
      loadRaffles();
    } else {
      toast('Erro ao excluir sorteio', 'error');
    }
  }

  function toggleNumber(num: number) {
    if (soldSet.has(num)) return;
    setSaleForm((prev) => {
      const has = prev.selectedNumbers.includes(num);
      if (!has && prev.selectedNumbers.length >= MAX_NUMBERS_PER_SALE) {
        toast(`Máximo de ${MAX_NUMBERS_PER_SALE} números por venda`, 'error');
        return prev;
      }
      return {
        ...prev,
        selectedNumbers: has
          ? prev.selectedNumbers.filter((n) => n !== num)
          : [...prev.selectedNumbers, num].sort((a, b) => a - b),
      };
    });
  }

  async function handleSell(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRaffle) return;
    if (saleForm.selectedNumbers.length === 0) {
      setError('Selecione ao menos um número');
      return;
    }
    if (!saleForm.receipt) {
      setError('Anexe o comprovante de pagamento');
      return;
    }

    setSelling(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('buyerName', formatBuyerName(saleForm.buyerName));
      formData.append('buyerPhone', saleForm.buyerPhone);
      if (saleForm.buyerPhoneExtra) formData.append('buyerPhoneExtra', saleForm.buyerPhoneExtra);
      formData.append('numbers', JSON.stringify(saleForm.selectedNumbers));
      formData.append('receipt', saleForm.receipt);

      const headers = await getAuthHeaders();
      const res = await fetch(`/api/raffles/${selectedRaffle.id}/sales`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao registrar venda');

      toast(`Venda registrada! Número(s): ${saleForm.selectedNumbers.join(', ')}`);
      const detail = await loadRaffleDetail(selectedRaffle.id);
      setSelectedRaffle(detail);
      resetSaleForm();
      loadRaffles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar venda');
    } finally {
      setSelling(false);
    }
  }

  function statusLabel(status: string) {
    if (status === 'active') return 'Ativa';
    if (status === 'closed') return 'Encerrada';
    return 'Sorteada';
  }

  function statusColor(status: string) {
    if (status === 'active') return 'bg-green-100 text-green-800';
    if (status === 'closed') return 'bg-slate-100 text-slate-600';
    return 'bg-blue-100 text-blue-800';
  }

  return (
    <PanelAccessGate role={user?.role} check={canViewRaffles} loading={!user}>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">Sorteios</h1>
            <p className="text-slate-600 text-sm mt-1">
              {canManage
                ? 'Cadastre sorteios e acompanhe as vendas dos irmãos.'
                : 'Venda números dos sorteios ativos do capítulo.'}
            </p>
          </div>
          <div className="flex gap-2">
            {view !== 'list' && (
              <button
                type="button"
                onClick={() => {
                  setView('list');
                  setSelectedRaffle(null);
                  setError('');
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
              >
                Voltar
              </button>
            )}
            {canManage && view === 'list' && (
              <button
                type="button"
                onClick={() => {
                  resetCreateForm();
                  setView('create');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Novo sorteio
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {view === 'list' && (
          <>
            {loading && <p className="text-slate-500">Carregando...</p>}
            {!loading && raffles.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                Nenhum sorteio cadastrado.
              </div>
            )}
            <div className="space-y-4">
              {raffles.map((raffle) => (
                <div
                  key={raffle.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-bold text-blue-800">{raffle.title}</h2>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(raffle.status)}`}>
                          {statusLabel(raffle.status)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">
                        {formatCurrency(raffle.pricePerNumber)} por número · Sorteio:{' '}
                        {formatDrawDate(raffle.drawAt)}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        Vendidos: {raffle.soldCount ?? 0} / {raffle.totalNumbers}
                      </p>
                      <ul className="text-sm text-slate-600 mt-2 list-disc list-inside">
                        {raffle.prizes.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {raffle.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => openSell(raffle)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium"
                        >
                          Vender números
                        </button>
                      )}
                      {canManage && raffle.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => handleCloseRaffle(raffle)}
                          className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                        >
                          Encerrar
                        </button>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRaffle(raffle)}
                          className="px-4 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50"
                        >
                          Excluir
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {view === 'create' && canManage && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="text-lg font-bold text-blue-800">Cadastrar novo sorteio</h2>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Título *</span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="Ex.: Sorteio de Páscoa 2026"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Descrição</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                rows={3}
              />
            </label>

            <div>
              <span className="text-sm font-medium text-slate-700">Banner (opcional)</span>
              <p className="text-xs text-slate-500 mt-0.5 mb-2">
                Imagem exibida no topo do sorteio na página pública. Máx. 5MB.
              </p>
              {form.bannerUrl && (
                <div className="relative w-full h-36 sm:h-44 mb-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                  <Image
                    src={form.bannerUrl}
                    alt="Preview do banner"
                    fill
                    className="object-cover"
                    unoptimized={form.bannerUrl.includes('supabase')}
                  />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 cursor-pointer">
                  {bannerUploading ? 'Enviando...' : form.bannerUrl ? 'Trocar banner' : 'Enviar banner'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={bannerUploading}
                    onChange={handleBannerUpload}
                  />
                </label>
                {form.bannerUrl && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, bannerUrl: '' })}
                    className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Valor por número (R$) *</span>
                <input
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.pricePerNumber}
                  onChange={(e) => setForm({ ...form, pricePerNumber: e.target.value })}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Total de números *</span>
                <input
                  required
                  type="number"
                  min="1"
                  max="10000"
                  value={form.totalNumbers}
                  onChange={(e) => setForm({ ...form, totalNumbers: e.target.value })}
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </label>
            </div>

            <div>
              <span className="text-sm font-medium text-slate-700">Prêmio(s) *</span>
              {form.prizes.map((prize, i) => (
                <div key={i} className="flex gap-2 mt-2">
                  <input
                    required={i === 0}
                    value={prize}
                    onChange={(e) => {
                      const next = [...form.prizes];
                      next[i] = e.target.value;
                      setForm({ ...form, prizes: next });
                    }}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2"
                    placeholder={`Prêmio ${i + 1}`}
                  />
                  {form.prizes.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setForm({ ...form, prizes: form.prizes.filter((_, j) => j !== i) })
                      }
                      className="px-3 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setForm({ ...form, prizes: [...form.prizes, ''] })}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                + Adicionar prêmio
              </button>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Data e hora do sorteio *</span>
              <input
                required
                type="datetime-local"
                value={form.drawAt}
                onChange={(e) => setForm({ ...form, drawAt: e.target.value })}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                WhatsApp para contato (botão no site) *
              </span>
              <input
                required
                value={form.whatsappContact}
                onChange={(e) => setForm({ ...form, whatsappContact: e.target.value })}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="(69) 99999-9999"
              />
              <span className="text-xs text-slate-500 mt-1 block">
                Este número será usado no botão &quot;Quero comprar&quot; da página pública.
              </span>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Chave PIX *</span>
              <input
                required
                value={form.pixKey}
                onChange={(e) => setForm({ ...form, pixKey: e.target.value })}
                className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="CPF, e-mail, telefone ou chave aleatória"
              />
              <span className="text-xs text-slate-500 mt-1 block">
                Exibida aos irmãos ao vender números (QR Code + copiar chave).
              </span>
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold"
            >
              {saving ? 'Salvando...' : 'Cadastrar sorteio'}
            </button>
          </form>
        )}

        {view === 'sell' && selectedRaffle && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-lg font-bold text-blue-800">{selectedRaffle.title}</h2>
              <p className="text-sm text-slate-600 mt-1">
                {formatCurrency(selectedRaffle.pricePerNumber)} por número · Sorteio:{' '}
                {formatDrawDate(selectedRaffle.drawAt)}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">Pagamento via PIX</h3>
                <button
                  type="button"
                  onClick={() => setShowPix(!showPix)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showPix ? 'Ocultar' : 'Mostrar PIX'}
                </button>
              </div>
              {showPix && (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <img
                    src={qrCodeUrl(selectedRaffle.pixKey, 180)}
                    alt="QR Code PIX"
                    width={180}
                    height={180}
                    className="rounded-lg border border-slate-200"
                  />
                  <div className="flex-1 w-full">
                    <p className="text-sm text-slate-600 mb-2">Chave PIX:</p>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={selectedRaffle.pixKey}
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm bg-slate-50"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedRaffle.pixKey);
                          toast('Chave PIX copiada!');
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                      >
                        Copiar
                      </button>
                    </div>
                    {saleForm.selectedNumbers.length > 0 && (
                      <p className="mt-3 text-sm font-semibold text-green-700">
                        Total: {formatCurrency(totalSale)} ({saleForm.selectedNumbers.length}{' '}
                        número{saleForm.selectedNumbers.length > 1 ? 's' : ''})
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSell} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <h3 className="font-semibold text-slate-800">Registrar venda</h3>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Nome do comprador *</span>
                <input
                  required
                  value={saleForm.buyerName}
                  onChange={(e) =>
                    setSaleForm({ ...saleForm, buyerName: formatBuyerNameInput(e.target.value) })
                  }
                  className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2 uppercase"
                  placeholder="NOME COMPLETO"
                />
              </label>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Telefone *</span>
                  <input
                    required
                    value={saleForm.buyerPhone}
                    onChange={(e) => setSaleForm({ ...saleForm, buyerPhone: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                    placeholder="(69) 99999-9999"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Telefone extra (opcional)</span>
                  <input
                    value={saleForm.buyerPhoneExtra}
                    onChange={(e) => setSaleForm({ ...saleForm, buyerPhoneExtra: e.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-2"
                    placeholder="(69) 98888-8888"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Comprovante de pagamento *</span>
                <input
                  required
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) =>
                    setSaleForm({ ...saleForm, receipt: e.target.files?.[0] ?? null })
                  }
                  className="mt-1 w-full text-sm"
                />
              </label>

              <div>
                <span className="text-sm font-medium text-slate-700">
                  Selecione os números disponíveis *
                </span>
                <p className="text-xs text-slate-500 mb-2">
                  Selecionados: {saleForm.selectedNumbers.length > 0
                    ? saleForm.selectedNumbers.join(', ')
                    : 'nenhum'}
                  {' '}(máx. {MAX_NUMBERS_PER_SALE} por venda)
                </p>
                <div
                  className="grid gap-1.5 max-h-64 overflow-y-auto p-2 border border-slate-200 rounded-lg"
                  style={{
                    gridTemplateColumns: `repeat(${selectedRaffle.totalNumbers <= 50 ? 10 : 15}, minmax(0, 1fr))`,
                  }}
                >
                  {Array.from({ length: selectedRaffle.totalNumbers }, (_, i) => i + 1).map((num) => {
                    const sold = soldSet.has(num);
                    const selected = saleForm.selectedNumbers.includes(num);
                    return (
                      <button
                        key={num}
                        type="button"
                        disabled={sold}
                        onClick={() => toggleNumber(num)}
                        className={`aspect-square rounded text-xs font-medium border transition-colors ${
                          sold
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
                            : selected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'bg-white border-slate-300 text-slate-700 hover:border-blue-400'
                        }`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={selling}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-semibold"
              >
                {selling ? 'Registrando...' : 'Confirmar venda'}
              </button>
            </form>
          </div>
        )}
      </div>
    </PanelAccessGate>
  );
}
