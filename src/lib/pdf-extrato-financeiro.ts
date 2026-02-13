import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { FinanceEntry } from '@/types';

const MARGIN = 50;
const LINE_HEIGHT = 14;
const FONT_SIZE = 10;
const TITLE_SIZE = 14;
const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const HEADER_LOGO_HEIGHT = 36;
const HEADER_PADDING = 12;

export interface ExtratoPdfOptions {
  /** Nome do capítulo (ex.: "Cap. Cavaleiros do Guaporé Nº 862") */
  chapterName?: string;
  /** Logo em PNG (bytes) para o cabeçalho */
  logoPngBytes?: Uint8Array;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
}

function formatMoney(value: number): string {
  return `R$ ${Math.abs(value).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export async function buildExtratoFinanceiroPdf(
  entries: FinanceEntry[],
  tituloPeriodo?: string,
  options?: ExtratoPdfOptions
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const sorted = [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const saldo = sorted.reduce((s, e) => s + e.amount, 0);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  if (options?.chapterName || options?.logoPngBytes) {
    const left = MARGIN;
    let xCurrent = left;
    if (options.logoPngBytes) {
      try {
        const img = await doc.embedPng(options.logoPngBytes);
        const scale = HEADER_LOGO_HEIGHT / img.height;
        const w = img.width * scale;
        page.drawImage(img, { x: xCurrent, y: y - HEADER_LOGO_HEIGHT, width: w, height: HEADER_LOGO_HEIGHT });
        xCurrent += w + HEADER_PADDING;
      } catch {
        // ignore
      }
    }
    if (options.chapterName) {
      page.drawText(options.chapterName, {
        x: xCurrent,
        y: y - LINE_HEIGHT - 4,
        size: 12,
        font: fontBold,
        color: rgb(0.1, 0.2, 0.5),
      });
    }
    y -= HEADER_LOGO_HEIGHT + LINE_HEIGHT + 8;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.5,
      color: rgb(0.2, 0.3, 0.5),
    });
    y -= LINE_HEIGHT + 8;
  }

  page.drawText('Extrato Financeiro', { x: MARGIN, y, size: TITLE_SIZE, font: fontBold, color: rgb(0.1, 0.2, 0.5) });
  y -= LINE_HEIGHT + 4;

  if (tituloPeriodo) {
    page.drawText(tituloPeriodo, { x: MARGIN, y, size: FONT_SIZE, font, color: rgb(0.2, 0.2, 0.2) });
    y -= LINE_HEIGHT;
  }

  page.drawText(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`, {
    x: MARGIN, y, size: 9, font, color: rgb(0.4, 0.4, 0.4),
  });
  y -= LINE_HEIGHT + 8;

  const colDate = MARGIN;
  const colDesc = MARGIN + 72;
  const colType = MARGIN + 280;
  const colVal = PAGE_WIDTH - MARGIN - 75;

  page.drawText('Data', { x: colDate, y, size: FONT_SIZE, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Descrição', { x: colDesc, y, size: FONT_SIZE, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Tipo', { x: colType, y, size: FONT_SIZE, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText('Valor', { x: colVal, y, size: FONT_SIZE, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= LINE_HEIGHT + 2;

  const descMaxWidth = colVal - colDesc - 10;

  for (const e of sorted) {
    if (y < MARGIN + 60) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
    const desc = (e.description || '—').slice(0, 50);
    const tipo = e.amount >= 0 ? 'Entrada' : 'Saída';
    const valorStr = (e.amount >= 0 ? '+' : '') + formatMoney(e.amount);
    page.drawText(formatDate(e.date), { x: colDate, y, size: FONT_SIZE, font, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(desc, { x: colDesc, y, size: FONT_SIZE, font, color: rgb(0.1, 0.1, 0.1) });
    page.drawText(tipo, { x: colType, y, size: FONT_SIZE, font, color: e.amount >= 0 ? rgb(0, 0.5, 0) : rgb(0.7, 0, 0) });
    page.drawText(valorStr, { x: colVal, y, size: FONT_SIZE, font, color: e.amount >= 0 ? rgb(0, 0.5, 0) : rgb(0.7, 0, 0) });
    y -= LINE_HEIGHT;
  }

  if (y < MARGIN + 40) {
    page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    y = PAGE_HEIGHT - MARGIN;
  }
  y -= LINE_HEIGHT;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 0.5,
    color: rgb(0.3, 0.3, 0.3),
  });
  y -= LINE_HEIGHT;
  page.drawText('Saldo do período', { x: colType, y, size: FONT_SIZE, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  page.drawText(formatMoney(saldo), {
    x: colVal,
    y,
    size: FONT_SIZE,
    font: fontBold,
    color: saldo >= 0 ? rgb(0, 0.5, 0) : rgb(0.7, 0, 0),
  });

  return doc.save();
}
