import { NextResponse, type NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { fillTemplateExcelData } from '@/lib/fill-template-nome-mestre';

const TEMPLATE_BASE = 'relatorio_arrecadacao_crn';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAuthenticatedClient(request);
    if (!supabase) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const base = process.cwd();
    const candidates = [
      path.join(base, 'public', `${TEMPLATE_BASE}.xlsx`),
      path.join(base, 'public', TEMPLATE_BASE, `${TEMPLATE_BASE}.xlsx`),
    ];
    const templatePath = candidates.find((p) => fs.existsSync(p));
    if (!templatePath) {
      return NextResponse.json(
        { error: `Modelo ${TEMPLATE_BASE}.xlsx não encontrado em public.` },
        { status: 404 }
      );
    }

    const admin = createAdminClient();
    const [mestre, tesoureiro, pcc] = await Promise.all([
      admin.from('profiles').select('name').eq('role', 'mestre_conselheiro').limit(1).maybeSingle(),
      admin.from('profiles').select('name').eq('role', 'tesoureiro').limit(1).maybeSingle(),
      admin.from('profiles').select('name').eq('role', 'presidente_consultivo').limit(1).maybeSingle(),
    ]);

    const buffer = await fillTemplateExcelData(templatePath, {
      nome_mestre: mestre.data?.name ?? '',
      nome_tesoureiro: tesoureiro.data?.name ?? '',
      nome_pcc: pcc.data?.name ?? '',
    });
    const body: Uint8Array = Buffer.isBuffer(buffer) ? new Uint8Array(buffer) : new Uint8Array(buffer as ArrayBuffer);
    const filename = `${TEMPLATE_BASE}.xlsx`;
    return new NextResponse(body as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(body.length),
      },
    });
  } catch (err) {
    console.error('[GET /api/downloads/relatorio-arrecadacao-crn]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao gerar relatório' },
      { status: 500 }
    );
  }
}
