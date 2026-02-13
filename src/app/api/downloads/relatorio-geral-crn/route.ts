import { NextResponse, type NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { fillTemplateNomeMestreDocx } from '@/lib/fill-template-nome-mestre';

const TEMPLATE_BASE = 'relatorio_geral_crn';

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
    ];
    const templatePath = candidates.find((p) => fs.existsSync(p));
    if (!templatePath) {
      return NextResponse.json(
        { error: `Modelo ${TEMPLATE_BASE}.docx não encontrado em public.` },
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

    const buffer = fillTemplateNomeMestreDocx(templatePath, nomeMestre);
    const filename = `${TEMPLATE_BASE}.docx`;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
    });
  } catch (err) {
    console.error('[GET /api/downloads/relatorio-geral-crn]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao gerar relatório' },
      { status: 500 }
    );
  }
}
