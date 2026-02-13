import { NextResponse, type NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { fillTemplateNomeMestre, fillTemplateNomeMestreDocx } from '@/lib/fill-template-nome-mestre';

const TEMPLATE_BASE = 'relatorio_arrecadacao_fundos';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAuthenticatedClient(request);
    if (!supabase) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const base = process.cwd();
    const candidates = [
      path.join(base, 'public', `${TEMPLATE_BASE}.docx`),
      path.join(base, 'public', TEMPLATE_BASE, `${TEMPLATE_BASE}.docx`),
      path.join(base, 'public', `${TEMPLATE_BASE}.xlsx`),
      path.join(base, 'public', TEMPLATE_BASE, `${TEMPLATE_BASE}.xlsx`),
    ];
    const templatePath = candidates.find((p) => fs.existsSync(p));
    if (!templatePath) {
      return NextResponse.json(
        { error: `Modelo ${TEMPLATE_BASE}.docx ou .xlsx não encontrado em public.` },
        { status: 404 }
      );
    }

    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('name')
      .eq('role', 'mestre_conselheiro')
      .limit(1)
      .maybeSingle();
    const nomeMestre = profile?.name ?? '';

    const isDocx = templatePath.endsWith('.docx');
    const buffer = isDocx
      ? fillTemplateNomeMestreDocx(templatePath, nomeMestre)
      : await fillTemplateNomeMestre(templatePath, nomeMestre);
    const filename = isDocx ? `${TEMPLATE_BASE}.docx` : `${TEMPLATE_BASE}.xlsx`;
    const contentType = isDocx
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    console.error('[GET /api/downloads/relatorio-arrecadacao-fundos]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao gerar relatório' },
      { status: 500 }
    );
  }
}
