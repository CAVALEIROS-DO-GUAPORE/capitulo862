/** Formata nome durante digitação (maiúsculas, sem remover espaços no fim). */
export function formatBuyerNameInput(name: string): string {
  return name.toUpperCase().replace(/  +/g, ' ');
}

/** Formata nome do comprador em maiúsculas (uso ao salvar). */
export function formatBuyerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toUpperCase();
}

/** Normaliza telefone para exibição (apenas dígitos). */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Gera link wa.me a partir do contato cadastrado na rifa. */
export function whatsappUrl(contact: string, message?: string): string {
  let digits = normalizePhone(contact);
  if (!digits) return '#';
  if (digits.length <= 11 && !digits.startsWith('55')) {
    digits = `55${digits}`;
  }
  const base = `https://wa.me/${digits}`;
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatDrawDate(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function emvField(id: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16Ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function projectPixText(value: string, max: number): string {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .toUpperCase()
      .slice(0, max) || 'CAPITULO'
  );
}

/** Normaliza chave PIX conforme tipo (telefone com +55, e-mail minúsculo, CPF/CNPJ). */
export function normalizePixKey(raw: string): string {
  const key = raw.trim();
  if (!key) return '';

  if (key.includes('@')) return key.toLowerCase();

  const digits = key.replace(/\D/g, '');
  const hasPhoneFormatting = /[()\-\s+]/.test(key);

  // Telefone com formatação explícita
  if (hasPhoneFormatting && digits.length >= 10 && digits.length <= 13) {
    let phone = digits.startsWith('55') ? digits : `55${digits}`;
    return `+${phone}`;
  }

  // CNPJ
  if (digits.length === 14) return digits;

  // CPF (11 dígitos sem formatação de telefone)
  if (digits.length === 11) return digits;

  // Telefone só dígitos (10, 12 ou 13)
  if (digits.length === 10 || digits.length === 12 || digits.length === 13) {
    let phone = digits.startsWith('55') ? digits : `55${digits}`;
    return `+${phone}`;
  }

  return key;
}

export interface PixBrCodeOptions {
  pixKey: string;
  merchantName?: string;
  merchantCity?: string;
  amount?: number;
  description?: string;
  txid?: string;
}

/**
 * Gera payload PIX Copia e Cola (BR Code estático EMV) legível por apps de banco.
 */
export function buildPixBrCode(opts: PixBrCodeOptions): string {
  const pixKey = normalizePixKey(opts.pixKey);
  if (!pixKey) return '';

  const merchantName = projectPixText(opts.merchantName || 'Capitulo DeMolay 862', 25);
  const merchantCity = projectPixText(opts.merchantCity || 'PONTES E LACERDA', 15);
  const txid = (opts.txid || '***').replace(/[^a-zA-Z0-9*]/g, '').slice(0, 25) || '***';
  const description = opts.description
    ? opts.description.normalize('NFD').replace(/[\u0300-\u036f]/g, '').slice(0, 72)
    : '';

  let merchantAccount = emvField('00', 'br.gov.bcb.pix') + emvField('01', pixKey);
  if (description) {
    merchantAccount += emvField('02', description);
  }

  let payload = '';
  payload += emvField('00', '01');
  payload += emvField('26', merchantAccount);
  payload += emvField('52', '0000');
  payload += emvField('53', '986');
  if (opts.amount != null && opts.amount > 0) {
    payload += emvField('54', opts.amount.toFixed(2));
  }
  payload += emvField('58', 'BR');
  payload += emvField('59', merchantName);
  payload += emvField('60', merchantCity);
  payload += emvField('62', emvField('05', txid));
  payload += '6304';
  payload += crc16Ccitt(payload);
  return payload;
}
