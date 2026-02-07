import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { InternalMinutes, Member, RollCall } from '@/types';

const MARGIN = 50;
const FRAME_PADDING = 12;
const LINE_HEIGHT = 14;
const FONT_SIZE = 11;
const TITLE_SIZE = 14;

const CATEGORY_LABELS: Record<string, string> = {
  demolays: 'DeMolays ativos',
  seniores: 'Sêniores ativos',
  consultores: 'Tios maçons / Consultores',
  escudeiros: 'Escudeiros',
};

function formatDateParts(dateStr: string): { day: string; month: string; year: string } {
  if (!dateStr) return { day: '', month: '', year: '' };
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDate().toString();
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const month = months[d.getMonth()] || '';
  const year = d.getFullYear().toString();
  return { day, month, year };
}

function drawText(
  page: { drawText: (text: string, opts: { x: number; y: number; size: number; font: unknown; color?: unknown }) => void },
  text: string,
  x: number,
  y: number,
  font: unknown,
  size: number = FONT_SIZE,
  maxWidth?: number
): number {
  const lines = text.split('\n');
  let currentY = y;
  for (const line of lines) {
    page.drawText(line, { x, y: currentY, size, font, color: rgb(0.1, 0.1, 0.1) });
    currentY -= LINE_HEIGHT;
  }
  return currentY;
}

export async function buildAtaPdf(
  minute: InternalMinutes,
  rollCall: RollCall | null,
  members: Member[]
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595;
  const pageHeight = 842;
  const innerLeft = MARGIN + FRAME_PADDING;
  const innerRight = pageWidth - MARGIN - FRAME_PADDING;
  const innerTop = pageHeight - MARGIN - FRAME_PADDING;
  const innerBottom = MARGIN + FRAME_PADDING;
  const contentWidth = innerRight - innerLeft;

  let page = doc.addPage([pageWidth, pageHeight]);
  let y = innerTop;

  const drawFrame = () => {
    page.drawRectangle({
      x: MARGIN,
      y: MARGIN,
      width: pageWidth - 2 * MARGIN,
      height: pageHeight - 2 * MARGIN,
      borderColor: rgb(0.2, 0.3, 0.5),
      borderWidth: 2,
    });
    page.drawRectangle({
      x: MARGIN + 4,
      y: MARGIN + 4,
      width: pageWidth - 2 * MARGIN - 8,
      height: pageHeight - 2 * MARGIN - 8,
      borderColor: rgb(0.3, 0.4, 0.6),
      borderWidth: 0.5,
    });
  };
  drawFrame();

  const ataNum = minute.status === 'publicada' && minute.ataNumber != null && minute.ataYear != null
    ? `ATA nº ${String(minute.ataNumber).padStart(3, '0')} / ${minute.ataYear}`
    : 'ATA';
  page.drawText(ataNum, { x: innerLeft, y, size: TITLE_SIZE, font: fontBold, color: rgb(0.1, 0.2, 0.5) });
  y -= LINE_HEIGHT + 4;

  page.drawText(minute.title || '', { x: innerLeft, y, size: TITLE_SIZE - 2, font: fontBold, color: rgb(0.15, 0.15, 0.15) });
  y -= LINE_HEIGHT + 8;

  const { day, month, year } = formatDateParts(minute.date || '');
  const dateLine = `Aos ${day} dias do mês de ${month} do ano de ${year}.`;
  page.drawText(dateLine, { x: innerLeft, y, size: FONT_SIZE, font, color: rgb(0.1, 0.1, 0.1) });
  y -= LINE_HEIGHT;

  const locationText = minute.ourLodge
    ? 'No Templo da Augusta e Respeitável Loja Maçônica Estrela do Guaporé nº 63.'
    : (minute.locationName || minute.city)
      ? `No Templo da ${[minute.locationName, minute.city].filter(Boolean).join(', ')}.`
      : 'No Templo indicado na convocação.';
  const locLines = locationText.match(/.{1,80}(\s|$)/g) || [locationText];
  for (const line of locLines) {
    page.drawText(line.trim(), { x: innerLeft, y, size: FONT_SIZE, font, color: rgb(0.1, 0.1, 0.1) });
    y -= LINE_HEIGHT;
  }
  y -= 4;

  const attendance = rollCall?.attendance || {};
  const presentByCategory: Record<string, string[]> = { demolays: [], seniores: [], consultores: [], escudeiros: [] };
  members.forEach((m) => {
    if (!attendance[m.id]) return;
    const cat = m.category || 'demolays';
    if (presentByCategory[cat]) presentByCategory[cat].push(m.name);
  });

  page.drawText('Estiveram presentes os seguintes membros:', { x: innerLeft, y, size: FONT_SIZE, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= LINE_HEIGHT;
  (['demolays', 'seniores', 'consultores', 'escudeiros'] as const).forEach((cat) => {
    const names = presentByCategory[cat];
    if (names?.length) {
      page.drawText(`${CATEGORY_LABELS[cat]}: ${names.join(', ')}`, { x: innerLeft, y, size: FONT_SIZE, font, color: rgb(0.1, 0.1, 0.1) });
      y -= LINE_HEIGHT;
    }
  });
  y -= 4;

  if (minute.presidingMc || minute.presiding1c || minute.presiding2c) {
    page.drawText('Presidência:', { x: innerLeft, y, size: FONT_SIZE, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    y -= LINE_HEIGHT;
    const pres = [minute.presidingMc && `Mestre Conselheiro: ${minute.presidingMc}`, minute.presiding1c && `1º Conselheiro: ${minute.presiding1c}`, minute.presiding2c && `2º Conselheiro: ${minute.presiding2c}`].filter(Boolean);
    pres.forEach((line) => {
      page.drawText(line as string, { x: innerLeft, y, size: FONT_SIZE, font, color: rgb(0.1, 0.1, 0.1) });
      y -= LINE_HEIGHT;
    });
    y -= 4;
  }

  if (minute.tiosPresentes?.length) {
    page.drawText(`Tios presentes: ${minute.tiosPresentes.join(', ')}`, { x: innerLeft, y, size: FONT_SIZE, font, color: rgb(0.1, 0.1, 0.1) });
    y -= LINE_HEIGHT;
    y -= 4;
  }

  if (minute.startTime || minute.endTime) {
    page.drawText(`Horário de início: ${minute.startTime || '-'} | Término: ${minute.endTime || '-'}`, { x: innerLeft, y, size: FONT_SIZE, font, color: rgb(0.1, 0.1, 0.1) });
    y -= LINE_HEIGHT;
    y -= 4;
  }

  if (minute.trabalhosTexto) {
    const trabLine = `Os trabalhos (${minute.trabalhosTexto}).`;
    const trabChunks = trabLine.match(/.{1,85}(\s|$)/g) || [trabLine];
    trabChunks.forEach((line) => {
      page.drawText(line.trim(), { x: innerLeft, y, size: FONT_SIZE, font, color: rgb(0.1, 0.1, 0.1) });
      y -= LINE_HEIGHT;
    });
    y -= 4;
  }

  page.drawText('Conteúdo da reunião:', { x: innerLeft, y, size: FONT_SIZE, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= LINE_HEIGHT;

  const content = minute.content || '';
  const contentLines = content.split('\n');
  for (const line of contentLines) {
    const chunks = line.match(/.{1,85}(\s|$)/g) || [line];
    for (const chunk of chunks) {
      if (y < innerBottom + LINE_HEIGHT) {
        page = doc.addPage([pageWidth, pageHeight]);
        drawFrame();
        y = innerTop;
      }
      page.drawText(chunk.trim(), { x: innerLeft, y, size: FONT_SIZE, font, color: rgb(0.1, 0.1, 0.1) });
      y -= LINE_HEIGHT;
    }
  }
  y -= 8;

  if (y < innerBottom + 3 * LINE_HEIGHT) {
    page = doc.addPage([pageWidth, pageHeight]);
    drawFrame();
    y = innerTop;
  }
  if (minute.escrivaoName) {
    page.drawText(`Eu, ${minute.escrivaoName}, Escrivão deste Capítulo,`, { x: innerLeft, y, size: FONT_SIZE, font, color: rgb(0.1, 0.1, 0.1) });
    y -= LINE_HEIGHT + 20;
    page.drawText('_________________________', { x: innerLeft, y, size: FONT_SIZE, font, color: rgb(0.3, 0.3, 0.3) });
    page.drawText('Assinatura', { x: innerLeft, y: y - 12, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  }

  return doc.save();
}
