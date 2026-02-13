import { NextResponse, type NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

/** Roles que têm nome/assinatura no relatório: escrivão, mestre, PCC (Presidente do Conselho Consultivo), tesoureiro */
const ROLES_MAP = [
  { key: 'escrivao', role: 'escrivao' },
  { key: 'mestre', role: 'mestre_conselheiro' },
  { key: 'pcc', role: 'presidente_consultivo' },
  { key: 'tesoureiro', role: 'tesoureiro' },
] as const;

const PLACEHOLDERS_NOME = ['nome_escrivao', 'nome_mestre', 'nome_pcc', 'nome_tesoureiro'] as const;
const PLACEHOLDERS_ASSINATURA = ['assinatura_escrivao', 'assinatura_mestre', 'assinatura_pcc', 'assinatura_tesoureiro'] as const;

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  } catch {
    return null;
  }
}

function getImageExtension(buffer: Buffer): 'png' | 'jpeg' | 'gif' {
  const sig = buffer.slice(0, 8);
  if (sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e) return 'png';
  if (sig[0] === 0xff && sig[1] === 0xd8) return 'jpeg';
  if (sig[0] === 0x47 && sig[1] === 0x49 && sig[2] === 0x46) return 'gif';
  return 'png';
}

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
 * GET: Gera o Relatório Tesouraria Geral em Excel com nomes e assinaturas do sistema.
 * Placeholders no modelo Excel:
 * - Texto: {nome_escrivao}, {nome_mestre}, {nome_pcc}, {nome_tesoureiro}
 * - Imagem (célula com o placeholder): {assinatura_escrivao}, {assinatura_mestre}, {assinatura_pcc}, {assinatura_tesoureiro}
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAuthenticatedClient(request);
    if (!supabase) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const base = process.cwd();
    const candidates = [
      path.join(base, 'public', 'relatorio_tesouraria_geral.xlsx'),
      path.join(base, 'public', 'relatorio_tesouraria_geral', 'relatorio_tesouraria_geral.xlsx'),
    ];
    const templatePath = candidates.find((p) => fs.existsSync(p));
    if (!templatePath) {
      return NextResponse.json(
        { error: 'Modelo relatorio_tesouraria_geral.xlsx não encontrado em public.' },
        { status: 404 }
      );
    }

    const admin = createAdminClient();
    const data: Record<string, string | null> = {
      nome_escrivao: '',
      nome_mestre: '',
      nome_pcc: '',
      nome_tesoureiro: '',
      assinatura_escrivao: null,
      assinatura_mestre: null,
      assinatura_pcc: null,
      assinatura_tesoureiro: null,
    };

    for (const { key, role } of ROLES_MAP) {
      const { data: profile } = await admin
        .from('profiles')
        .select('name, signature_url')
        .eq('role', role)
        .limit(1)
        .maybeSingle();
      if (profile) {
        data[`nome_${key}`] = profile.name || '';
        data[`assinatura_${key}`] = profile.signature_url || null;
      }
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    // 1) Substituir textos e marcar células de assinatura
    const imageCells: { sheetName: string; row: number; col: number; key: string }[] = [];

    for (const worksheet of workbook.worksheets) {
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const raw = cell.value;
          let text = cellValueToString(raw);
          if (!text) return;

          for (const key of PLACEHOLDERS_NOME) {
            const placeholder = `{${key}}`;
            if (text.includes(placeholder)) {
              text = text.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), data[key] ?? '');
            }
          }
          for (const key of PLACEHOLDERS_ASSINATURA) {
            const placeholder = `{${key}}`;
            if (text.includes(placeholder)) {
              imageCells.push({
                sheetName: worksheet.name,
                row: rowNumber,
                col: colNumber,
                key,
              });
              text = text.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), '');
            }
          }
          if (text !== cellValueToString(raw)) {
            cell.value = text;
          }
        });
      });
    }

    // 2) Inserir imagens de assinatura nas células marcadas
    const IMAGE_WIDTH = 120;
    const IMAGE_HEIGHT = 50;

    for (const { sheetName, row, col, key } of imageCells) {
      const url = data[key];
      if (!url) continue;
      const buf = await fetchImageBuffer(url);
      if (!buf || buf.length === 0) continue;

      const worksheet = workbook.getWorksheet(sheetName);
      if (!worksheet) continue;

      const ext = getImageExtension(buf);
      const imageId = workbook.addImage({
        buffer: buf,
        extension: ext,
      });
      worksheet.addImage(imageId, {
        tl: { col: col - 1, row: row - 1 },
        ext: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT },
      });
    }

    const out = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
    const filename = 'relatorio_tesouraria_geral.xlsx';
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    console.error('[GET /api/downloads/relatorio-tesouraria-geral]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao gerar relatório' },
      { status: 500 }
    );
  }
}
