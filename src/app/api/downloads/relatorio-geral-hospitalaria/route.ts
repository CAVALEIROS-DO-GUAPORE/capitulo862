import { NextResponse, type NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import sharp from 'sharp';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ImageModule = require('docxtemplater-image-module-free');

/** Mestre, escrivão e hospitaleiro para o relatório geral hospitalaria */
const ROLES_MAP = [
  { key: 'mestre', role: 'mestre_conselheiro' },
  { key: 'escrivao', role: 'escrivao' },
  { key: 'hospitaleiro', role: 'hospitaleiro' },
] as const;

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

async function getImageSize(buf: Buffer): Promise<[number, number]> {
  try {
    const meta = await sharp(buf).metadata();
    const w = meta.width ?? 120;
    const h = meta.height ?? 50;
    const maxW = 180;
    const maxH = 70;
    const r = Math.min(maxW / w, maxH / h, 1);
    return [Math.round(w * r), Math.round(h * r)];
  } catch {
    return [120, 50];
  }
}

/**
 * GET: Gera o Relatório Geral Hospitalaria em Word (.docx).
 * Placeholders no modelo:
 * - Texto: {nome_mestre}, {nome_escrivao}, {nome_hospitaleiro}
 * - Imagem (em parágrafo separado): {%assinatura_mestre}, {%assinatura_escrivao}, {%assinatura_hospitaleiro}
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
      path.join(base, 'public', 'relatorio_geral_hospitalaria.docx'),
      path.join(base, 'public', 'relatorio_geral_hospitalaria', 'relatorio_geral_hospitalaria.docx'),
    ];
    const templatePath = candidates.find((p) => fs.existsSync(p));
    if (!templatePath) {
      return NextResponse.json(
        { error: 'Modelo relatorio_geral_hospitalaria.docx não encontrado em public.' },
        { status: 404 }
      );
    }

    const admin = createAdminClient();
    const data: Record<string, string | null> = {
      nome_mestre: '',
      nome_escrivao: '',
      nome_hospitaleiro: '',
      assinatura_mestre: null,
      assinatura_escrivao: null,
      assinatura_hospitaleiro: null,
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

    const imageOpts: Record<string, unknown> = {
      fileType: 'docx',
      getImage: (tagValue: string | null) => {
        if (!tagValue || typeof tagValue !== 'string') return null;
        return fetchImageBuffer(tagValue);
      },
      getSize: async (img: Buffer | null) => {
        if (!img || !Buffer.isBuffer(img)) return [120, 50];
        return getImageSize(img);
      },
    };
    const imageModule = new ImageModule(imageOpts);

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: () => '',
      modules: [imageModule],
    });
    await doc.renderAsync(data);

    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    }) as Buffer;

    const body = new Uint8Array(buf);
    const filename = 'relatorio_geral_hospitalaria.docx';
    return new NextResponse(body as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(body.length),
      },
    });
  } catch (err) {
    console.error('[GET /api/downloads/relatorio-geral-hospitalaria]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao gerar relatório' },
      { status: 500 }
    );
  }
}
