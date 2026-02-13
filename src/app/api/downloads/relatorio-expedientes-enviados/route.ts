import { NextResponse, type NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const PLACEHOLDERS = ['nome_escrivao', 'assinatura_escrivao'] as const;

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
 * GET: Gera o Relatório Expedientes e Enviados em Excel.
 * Placeholders no modelo: {nome_escrivao}, {assinatura_escrivao}
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
      path.join(base, 'public', 'relatorio_expedientes_e_enviados.xlsx'),
      path.join(base, 'public', 'relatorio_expedientes_e_enviados', 'relatorio_expedientes_e_enviados.xlsx'),
    ];
    const templatePath = candidates.find((p) => fs.existsSync(p));
    if (!templatePath) {
      return NextResponse.json(
        { error: 'Modelo relatorio_expedientes_e_enviados.xlsx não encontrado em public.' },
        { status: 404 }
      );
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('name, signature_url')
      .eq('role', 'escrivao')
      .limit(1)
      .maybeSingle();

    const data: Record<string, string | null> = {
      nome_escrivao: profile?.name ?? '',
      assinatura_escrivao: profile?.signature_url ?? null,
    };

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    const imageCells: { sheetName: string; row: number; col: number }[] = [];
    const IMAGE_WIDTH = 120;
    const IMAGE_HEIGHT = 50;

    for (const worksheet of workbook.worksheets) {
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          const raw = cell.value;
          let text = cellValueToString(raw);
          if (!text) return;

          if (text.includes('{nome_escrivao}')) {
            text = text.replace(/\{nome_escrivao\}/g, data.nome_escrivao ?? '');
          }
          if (text.includes('{assinatura_escrivao}')) {
            imageCells.push({ sheetName: worksheet.name, row: rowNumber, col: colNumber });
            text = text.replace(/\{assinatura_escrivao\}/g, '');
          }
          if (text !== cellValueToString(raw)) {
            cell.value = text;
          }
        });
      });
    }

    const url = data.assinatura_escrivao;
    if (url) {
      const buf = await fetchImageBuffer(url);
      if (buf && buf.length > 0) {
        const ext = getImageExtension(buf);
        const imageId = workbook.addImage({ buffer: buf, extension: ext });
        for (const { sheetName, row, col } of imageCells) {
          const worksheet = workbook.getWorksheet(sheetName);
          if (worksheet) {
            worksheet.addImage(imageId, {
              tl: { col: col - 1, row: row - 1 },
              ext: { width: IMAGE_WIDTH, height: IMAGE_HEIGHT },
            });
          }
        }
      }
    }

    const out = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.isBuffer(out) ? out : Buffer.from(out as ArrayBuffer);
    const filename = 'relatorio_expedientes_e_enviados.xlsx';
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    console.error('[GET /api/downloads/relatorio-expedientes-enviados]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao gerar relatório' },
      { status: 500 }
    );
  }
}
