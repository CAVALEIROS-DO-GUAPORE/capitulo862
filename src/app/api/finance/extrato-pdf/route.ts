import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getFinanceEntries } from '@/lib/data';
import { buildExtratoFinanceiroPdf } from '@/lib/pdf-extrato-financeiro';
import { CHAPTER_NAME, CHAPTER_NUMBER } from '@/data/mock';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ano = searchParams.get('ano');
    const mes = searchParams.get('mes');
    const opts: { ano?: number; mes?: number } = {};
    if (ano) {
      opts.ano = parseInt(ano, 10);
      if (mes) opts.mes = parseInt(mes, 10);
    }
    const entries = await getFinanceEntries(opts);
    let tituloPeriodo = 'Período: todos';
    if (opts.ano != null) {
      const meses = ['', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
      tituloPeriodo = opts.mes != null ? `${meses[opts.mes]} / ${opts.ano}` : `Ano ${opts.ano}`;
    }
    let logoPngBytes: Uint8Array | undefined;
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logocapitulo.png');
      const buf = await fs.promises.readFile(logoPath);
      logoPngBytes = new Uint8Array(buf);
    } catch {
      // logo opcional
    }
    const pdfBytes = await buildExtratoFinanceiroPdf(entries, tituloPeriodo, {
      chapterName: `Cap. ${CHAPTER_NAME} Nº ${CHAPTER_NUMBER}`,
      logoPngBytes,
    });
    return new NextResponse(pdfBytes as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="extrato-financeiro.pdf"`,
      },
    });
  } catch (err) {
    console.error('[extrato-pdf]', err);
    return NextResponse.json({ error: 'Erro ao gerar extrato' }, { status: 500 });
  }
}
