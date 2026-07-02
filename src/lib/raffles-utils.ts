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

export function qrCodeUrl(data: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}
