import { NextResponse, type NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const ROLES_CAN_DOWNLOAD = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao'];

/**
 * Disponibiliza o modelo Pautas e Frequência (Excel) apenas para escrivão, MC, 1º Conselheiro e admin.
 * Usuários normais recebem 403.
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

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !ROLES_CAN_DOWNLOAD.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Apenas escrivão, Mestre Conselheiro, 1º Conselheiro e admin podem baixar o modelo de pautas e frequência.' },
        { status: 403 }
      );
    }

    const base = process.cwd();
    const paths = [
      path.join(base, 'public', 'pautas_e_frequencia.xlsx'),
      path.join(base, 'public', 'pautas_e_frequencia', 'pautas_e_frequencia.xlsx'),
    ];
    let resolved = paths.find((p) => fs.existsSync(p));
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
