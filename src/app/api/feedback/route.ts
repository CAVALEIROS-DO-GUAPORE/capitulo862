import { NextResponse, type NextRequest } from 'next/server';
import { getChapterFeedback, insertChapterFeedback } from '@/lib/data';
import { canSubmitFeedback, canViewFeedback } from '@/lib/feedback-auth';
import { getRequestUser } from '@/lib/panel-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';
import type { FeedbackType } from '@/types';

const FEEDBACK_TYPES: FeedbackType[] = ['reclamacao', 'sugestao', 'elogio'];
const MAX_MESSAGE_LENGTH = 4000;

export async function GET(request: NextRequest) {
  if (!(await canViewFeedback(request))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }
  try {
    const items = await getChapterFeedback();
    return NextResponse.json(items);
  } catch (err) {
    console.error('[GET /api/feedback]', err);
    return NextResponse.json({ error: 'Erro ao carregar manifestações' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await canSubmitFeedback(request))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const user = await getRequestUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const limited = checkRateLimit(`feedback:${user.id}`, 8, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Muitos envios. Tente novamente mais tarde.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }

  try {
    const body = await request.json();
    const type = String(body.type || '').trim() as FeedbackType;
    const message = String(body.message || '').trim();
    const isAnonymous = Boolean(body.isAnonymous);

    if (!FEEDBACK_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'Tipo inválido. Use reclamação, sugestão ou elogio.' },
        { status: 400 }
      );
    }
    if (!message) {
      return NextResponse.json({ error: 'Escreva a mensagem' }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Mensagem deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres` },
        { status: 400 }
      );
    }

    let authorName: string | undefined;
    if (!isAnonymous) {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();
      authorName = profile?.name?.trim() || user.email || 'Membro';
    }

    const item = await insertChapterFeedback({
      type,
      message,
      isAnonymous,
      authorId: user.id,
      authorName,
    });

    return NextResponse.json({ success: true, id: item.id });
  } catch (err) {
    console.error('[POST /api/feedback]', err);
    return NextResponse.json({ error: 'Erro ao enviar manifestação' }, { status: 500 });
  }
}
