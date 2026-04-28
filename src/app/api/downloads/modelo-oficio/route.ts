import { NextResponse, type NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const ROLES_CAN_DOWNLOAD = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao', 'tesoureiro'];

/** Download do modelo original de ofício/convite (sem preenchimento automático). */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAuthenticatedClient(request);
    if (!supabase) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !ROLES_CAN_DOWNLOAD.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Apenas cargos com permissão da secretaria podem baixar o modelo.' },
        { status: 403 }
      );
    }

    const templatePath = path.join(process.cwd(), 'public', 'modelo_oficio.docx');
    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Modelo modelo_oficio.docx não encontrado em public.' }, { status: 404 });
    }

    const buf = fs.readFileSync(templatePath);
    const filename = 'modelo_oficio.docx';
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buf.length),
      },
    });
  } catch (err) {
    console.error('[GET /api/downloads/modelo-oficio]', err);
    return NextResponse.json({ error: 'Erro ao obter modelo' }, { status: 500 });
  }
}

