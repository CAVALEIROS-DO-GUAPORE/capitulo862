import type { InternalMinutes, Member, RollCall } from '@/types';

const LOCAL_CAPITULO = 'Augusta e Respeitável Loja Simbólica Estrela do Guaporé nº 63 na cidade de Pontes e Lacerda - MT';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function parseAtaDate(dateStr: string): Date {
  const t = (dateStr || '').trim();
  if (!t) return new Date();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return new Date(t + (t.length === 10 ? 'T12:00:00' : ''));
  const ddmmyy = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyy) {
    const [, day, month, year] = ddmmyy;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }
  const parsed = new Date(t);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/** Objeto para preencher o modelo Word: chaves são as tags {tag} do documento. */
export function buildAtaDocxData(
  minute: InternalMinutes,
  rollCall: RollCall | null,
  members: Member[]
): Record<string, string> {
  const d = parseAtaDate(minute.date || '');
  const diaAta = d.getDate().toString();
  const mêsAta = MESES[d.getMonth()] || '';
  const mesAta = mêsAta;
  const anoAta = d.getFullYear().toString();

  const local = minute.ourLodge
    ? LOCAL_CAPITULO
    : (minute.locationName || '').trim() || '';

  const attendance = rollCall?.attendance || {};
  const presentByCategory: Record<string, string[]> = { demolays: [], seniores: [], consultores: [], escudeiros: [] };
  members.forEach((m) => {
    if (!attendance[m.id]) return;
    const cat = m.category || 'demolays';
    if (presentByCategory[cat]) presentByCategory[cat].push(m.name);
  });

  const demolaysPresentes = (presentByCategory.demolays || []).join(', ');
  const senioresPresentes = (presentByCategory.seniores || []).join(', ');
  const maçonsPresentes = (presentByCategory.consultores || []).join(', ');

  const ataNumero =
    minute.status === 'publicada' && minute.ataNumber != null
      ? String(minute.ataNumber).padStart(3, '0')
      : '';
  const ataAno = minute.ataYear != null ? String(minute.ataYear) : anoAta;

  return {
    ataNumero,
    ataAno,
    ataGestao: minute.ataGestao || '',
    diaAta,
    mêsAta,
    mesAta,
    anoAta,
    local,
    demolaysPresentes,
    senioresPresentes,
    maçonsPresentes,
    mestreConselheiro: minute.presidingMc || '',
    primeiroConselheiro: minute.presiding1c || '',
    segundoConselheiro: minute.presiding2c || '',
    tioConselho: minute.tioConselho || '',
    horaInicio: minute.startTime || '',
    palavraSecreta: minute.palavraSecreta || '',
    pauta: minute.pauta || '',
    bemdaOrdem: minute.content || '',
    horaFim: minute.endTime || '',
    nomeEscrivao: minute.escrivaoName || '',
  };
}
