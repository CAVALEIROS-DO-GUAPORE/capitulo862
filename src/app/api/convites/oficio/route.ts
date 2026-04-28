import { NextResponse, type NextRequest } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildFilledOficioDocxBuffer } from '@/lib/build-oficio-docx-buffer';
import { getMembers } from '@/lib/data';

const ROLES_CAN_CREATE = ['admin', 'mestre_conselheiro', 'primeiro_conselheiro', 'escrivao', 'tesoureiro'] as const;

function formatDateBR(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function normalizeText(v: unknown): string {
  return String(v ?? '').trim();
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createAuthenticatedClient(request);
    if (!supabase) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const admin = createAdminClient();
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || !ROLES_CAN_CREATE.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Sem permissão para criar convites.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>));

    const NUM = normalizeText(body.NUM ?? body.num);
    const GESTAO = normalizeText(body.GESTAO ?? body.gestao);
    const ANO = String(new Date().getFullYear());

    const destino = normalizeText(body.destino);
    const assunto = normalizeText(body.assunto);
    const event = normalizeText(body.event);
    const date_event = normalizeText(body.date_event);
    const hora = normalizeText(body.hora);
    const local = normalizeText(body.local) || 'Loja Maçonica Estrela do Guaporé n°63';
    const texto = normalizeText(body.texto);

    const membroConselhoId = normalizeText(body.membroConselhoId);
    const membroConselhoLivre = normalizeText(body.membro_conselho);

    const [mestre, escrivao, members] = await Promise.all([
      admin.from('profiles').select('name').eq('role', 'mestre_conselheiro').limit(1).maybeSingle(),
      admin.from('profiles').select('name').eq('role', 'escrivao').limit(1).maybeSingle(),
      membroConselhoId ? getMembers() : Promise.resolve([]),
    ]);

    const membroFromId =
      membroConselhoId && members.length
        ? (members.find((m) => m.id === membroConselhoId)?.name ?? '')
        : '';

    const buffer = buildFilledOficioDocxBuffer({
      NUM,
      ANO,
      GESTAO,
      date: formatDateBR(new Date()),
      destino,
      assunto,
      event,
      date_event,
      hora,
      local,
      texto,
      mestre_conselheiro: mestre.data?.name ?? '',
      escrivao: escrivao.data?.name ?? '',
      membro_conselho: membroFromId || membroConselhoLivre,
    });

    const out = new Uint8Array(buffer);
    const filename = `convite-${new Date().toISOString().slice(0, 10)}.docx`;
    return new NextResponse(out, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(out.length),
      },
    });
  } catch (err) {
    console.error('[POST /api/convites/oficio]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao gerar convite' },
      { status: 500 }
    );
  }
}

