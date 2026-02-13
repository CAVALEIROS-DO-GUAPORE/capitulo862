import fs from 'fs';
import ExcelJS from 'exceljs';
import PizZip from 'pizzip';

function cellValueToString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object' && 'richText' in (value as object)) {
    const rt = (value as { richText: { text: string }[] }).richText;
    return Array.isArray(rt) ? rt.map((r) => r.text).join('') : '';
  }
  if (typeof value === 'object' && 'text' in (value as object)) return (value as { text: string }).text;
  return String(value);
}

/**
 * Carrega um .xlsx do caminho, substitui {nome_mestre} em todas as células e retorna o buffer.
 */
export async function fillTemplateNomeMestre(
  templatePath: string,
  nomeMestre: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  const value = nomeMestre || '';

  for (const worksheet of workbook.worksheets) {
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const raw = cell.value;
        let text = cellValueToString(raw);
        if (!text) return;
        if (text.includes('{nome_mestre}')) {
          text = text.replace(/\{nome_mestre\}/g, value);
          cell.value = text;
        }
      });
    });
  }

  const out = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
}

function escapeXmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Carrega um .docx do caminho, substitui {nome_mestre} (e variações como {nome_mestre) ) no XML e retorna o buffer.
 * Usa substituição direta no XML para evitar erro "Unclosed tag" quando o Word tiver typo (ex.: parêntese em vez de chave).
 */
export function fillTemplateNomeMestreDocx(
  templatePath: string,
  nomeMestre: string
): Buffer {
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);
  const value = escapeXmlText(nomeMestre || '');

  const docPath = 'word/document.xml';
  const file = zip.files[docPath];
  if (file) {
    let xml = file.asText();
    xml = xml.replace(/\{nome_mestre\)/g, value);
    xml = xml.replace(/\{nome_mestre\}/g, value);
    zip.file(docPath, xml);
  }

  return zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  }) as Buffer;
}

/**
 * Word: substitui vários placeholders no document.xml.
 * Para cada chave em data, substitui {chave} e {chave) no XML.
 */
export function fillTemplateDocxData(
  templatePath: string,
  data: Record<string, string>
): Buffer {
  const content = fs.readFileSync(templatePath, 'binary');
  const zip = new PizZip(content);

  const docPath = 'word/document.xml';
  const file = zip.files[docPath];
  if (file) {
    let xml = file.asText();
    for (const [key, val] of Object.entries(data)) {
      const value = escapeXmlText(val ?? '');
      xml = xml.replace(new RegExp(`\\{${key}\\)}`, 'g'), value);
      xml = xml.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    }
    zip.file(docPath, xml);
  }

  return zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  }) as Buffer;
}

/**
 * Excel: substitui vários placeholders em todas as células.
 * data: { nome_mestre: '...', nome_tesoureiro: '...', nome_pcc: '...' } etc.
 */
export async function fillTemplateExcelData(
  templatePath: string,
  data: Record<string, string>
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);

  for (const worksheet of workbook.worksheets) {
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const raw = cell.value;
        let text = cellValueToString(raw);
        if (!text) return;
        for (const [key, value] of Object.entries(data)) {
          const val = value ?? '';
          text = text.replace(new RegExp(`\\{${key}\\)}`, 'g'), val);
          text = text.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
        }
        if (text !== cellValueToString(raw)) cell.value = text;
      });
    });
  }

  const out = await workbook.xlsx.writeBuffer();
  return Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
}
