import { NextResponse, type NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { requirePanelUser } from '@/lib/panel-auth';

/** Modelo Pautas e Frequência (Excel) — disponível para todos os membros do painel. */
export async function GET(request: NextRequest) {
  try {
    const auth = await requirePanelUser(request);
    if (!auth.ok) return auth.response;

    const base = process.cwd();
    const paths = [
      path.join(base, 'public', 'pautas_e_frequencia.xlsx'),
      path.join(base, 'public', 'pautas_e_frequencia', 'pautas_e_frequencia.xlsx'),
    ];
    const resolved = paths.find((p) => fs.existsSync(p));
    if (!resolved) {
      return NextResponse.json(
        { error: 'Modelo pautas_e_frequencia.xlsx não encontrado em public.' },
        { status: 404 }
      );
    }

    const buf = fs.readFileSync(resolved);
    const filename = 'pautas_e_frequencia.xlsx';

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buf.length),
      },
    });
  } catch (err) {
    console.error('[GET /api/frequencia-modelo]', err);
    return NextResponse.json({ error: 'Erro ao obter modelo' }, { status: 500 });
  }
}
