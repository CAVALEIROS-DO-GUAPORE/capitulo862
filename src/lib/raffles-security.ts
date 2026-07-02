import type { PublicRaffle, Raffle, RaffleSoldNumber } from '@/types';

/** Máximo de números por venda (impede abuso mesmo com sessão válida). */
export const MAX_NUMBERS_PER_SALE = 20;

/** Máximo de vendas registradas por usuário por sorteio por hora. */
export const MAX_SALES_PER_USER_PER_HOUR = 30;

export const MAX_BUYER_NAME_LENGTH = 120;
export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 2000;
export const MAX_PRIZE_LENGTH = 200;
export const MAX_PRIZES = 10;
export const MAX_TOTAL_NUMBERS = 10000;
export const MIN_PHONE_DIGITS = 10;
export const MAX_PHONE_DIGITS = 13;
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const saleRateLimit = new Map<string, number[]>();

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function parseSaleNumbers(
  raw: unknown,
  opts: { maxPerSale: number; totalNumbers: number }
): number[] {
  let parsed: unknown[] = [];

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const json = JSON.parse(trimmed);
      if (Array.isArray(json)) parsed = json;
      else throw new Error('invalid');
    } catch {
      parsed = trimmed.split(/[,\s]+/);
    }
  } else if (Array.isArray(raw)) {
    parsed = raw;
  } else {
    return [];
  }

  const numbers: number[] = [];
  for (const item of parsed) {
    const n = Number(item);
    if (!Number.isInteger(n) || n < 1 || n > opts.totalNumbers) {
      throw new Error(`Número inválido: ${item}`);
    }
    numbers.push(n);
  }

  const unique = [...new Set(numbers)].sort((a, b) => a - b);
  if (unique.length === 0) {
    throw new Error('Selecione ao menos um número');
  }
  if (unique.length > opts.maxPerSale) {
    throw new Error(`Máximo de ${opts.maxPerSale} números por venda`);
  }
  if (unique.length !== numbers.length) {
    throw new Error('Não envie números duplicados na mesma venda');
  }

  return unique;
}

export function validateBuyerName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (!trimmed) throw new Error('Nome do comprador é obrigatório');
  if (trimmed.length > MAX_BUYER_NAME_LENGTH) {
    throw new Error(`Nome deve ter no máximo ${MAX_BUYER_NAME_LENGTH} caracteres`);
  }
  if (!/^[\p{L}\p{M}\s'.-]+$/u.test(trimmed)) {
    throw new Error('Nome contém caracteres inválidos');
  }
  return trimmed.toUpperCase();
}

export function validatePhone(phone: string, label = 'Telefone'): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < MIN_PHONE_DIGITS || digits.length > MAX_PHONE_DIGITS) {
    throw new Error(`${label} inválido`);
  }
  return digits;
}

export function validateBannerUrl(url: string | undefined | null): string | undefined {
  if (url == null || url === '') return undefined;
  const trimmed = String(url).trim();
  if (!trimmed) return undefined;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('URL do banner inválida');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Banner deve usar HTTPS');
  }

  const supabaseHost = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname;
    } catch {
      return '';
    }
  })();

  if (!supabaseHost || parsed.hostname !== supabaseHost) {
    throw new Error('Banner deve ser hospedado no Storage do capítulo');
  }

  if (!parsed.pathname.includes('/storage/v1/object/public/raffle-images/')) {
    throw new Error('Banner deve vir do bucket raffle-images');
  }

  return trimmed;
}

export function assertSaleRateLimit(userId: string, raffleId: string): void {
  const key = `${userId}:${raffleId}`;
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const prev = (saleRateLimit.get(key) || []).filter((t) => now - t < windowMs);
  if (prev.length >= MAX_SALES_PER_USER_PER_HOUR) {
    throw new Error('Limite de vendas por hora atingido. Tente novamente mais tarde.');
  }
  prev.push(now);
  saleRateLimit.set(key, prev);
}

export function sanitizePublicRaffle(raffle: Raffle, soldNumbers: RaffleSoldNumber[]): PublicRaffle {
  return {
    id: raffle.id,
    title: raffle.title,
    description: raffle.description,
    pricePerNumber: raffle.pricePerNumber,
    prizes: raffle.prizes,
    drawAt: raffle.drawAt,
    whatsappContact: raffle.whatsappContact,
    pixKey: '',
    totalNumbers: raffle.totalNumbers,
    status: raffle.status,
    bannerUrl: raffle.bannerUrl,
    createdAt: raffle.createdAt,
    updatedAt: raffle.updatedAt,
    soldCount: raffle.soldCount,
    soldNumbers: soldNumbers.map((s) => ({
      number: s.number,
      buyerName: s.buyerName,
    })),
  };
}

export function validateCreateRaffleInput(body: Record<string, unknown>) {
  const title = String(body.title ?? '').trim();
  if (!title || title.length > MAX_TITLE_LENGTH) {
    throw new Error(`Título inválido (máx. ${MAX_TITLE_LENGTH} caracteres)`);
  }

  const description =
    body.description != null ? String(body.description).trim().slice(0, MAX_DESCRIPTION_LENGTH) : undefined;

  const price = Number(body.pricePerNumber);
  if (!Number.isFinite(price) || price <= 0 || price > 1_000_000) {
    throw new Error('Valor por número inválido');
  }

  const total = Number(body.totalNumbers);
  if (!Number.isInteger(total) || total < 1 || total > MAX_TOTAL_NUMBERS) {
    throw new Error(`Quantidade de números inválida (1–${MAX_TOTAL_NUMBERS})`);
  }

  const prizes = Array.isArray(body.prizes)
    ? body.prizes.map((p) => String(p).trim()).filter(Boolean).slice(0, MAX_PRIZES)
    : [];
  if (prizes.length === 0) throw new Error('Informe ao menos um prêmio');
  for (const p of prizes) {
    if (p.length > MAX_PRIZE_LENGTH) throw new Error('Prêmio muito longo');
  }

  const drawAt = String(body.drawAt ?? '');
  if (!drawAt || Number.isNaN(Date.parse(drawAt))) {
    throw new Error('Data do sorteio inválida');
  }

  const whatsappContact = validatePhone(String(body.whatsappContact ?? ''), 'WhatsApp');
  const pixKey = String(body.pixKey ?? '').trim();
  if (!pixKey || pixKey.length > 120) throw new Error('Chave PIX inválida');

  const bannerUrl = validateBannerUrl(body.bannerUrl != null ? String(body.bannerUrl) : undefined);

  return {
    title,
    description,
    pricePerNumber: price,
    totalNumbers: total,
    prizes,
    drawAt,
    whatsappContact,
    pixKey,
    bannerUrl,
  };
}
