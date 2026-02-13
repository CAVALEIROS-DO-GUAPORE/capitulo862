import { NextResponse, type NextRequest } from 'next/server';
import { createAuthenticatedClient } from '@/lib/supabase/api-auth';
import { createAdminClient } from '@/lib/supabase/admin';

const BUCKET = 'avatars';

export async function POST(request: NextRequest) {
  const supabase = createAuthenticatedClient(request);
  if (!supabase) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Envie uma imagem válida (JPEG, PNG, etc.)' }, { status: 400 });
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: 'Imagem deve ter no máximo 5MB' }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    // Buscar avatar atual e nome para excluir arquivo antigo e sincronizar com membros
    const { data: profile } = await admin
      .from('profiles')
      .select('avatar_url, name')
      .eq('id', user.id)
      .single();

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/${Date.now()}-avatar.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    // Excluir avatar anterior do storage (economizar espaço)
    if (profile?.avatar_url) {
      try {
        const oldPath = extractStoragePath(profile.avatar_url);
        if (oldPath) {
          await admin.storage.from(BUCKET).remove([oldPath]);
        }
      } catch {
        // Ignora erro ao excluir arquivo antigo
      }
    }

    // Atualizar perfil com nova URL
    const { error: updateError } = await admin
      .from('profiles')
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Replicar a mesma foto no cadastro de membros (página pública /membros)
    const { data: updatedByUser } = await admin
      .from('members')
      .update({ photo: publicUrl })
      .eq('user_id', user.id)
      .select('id');

    // Se nenhum membro está vinculado por user_id, tenta atualizar por nome (membro sem vínculo ainda)
    const profileName = profile?.name?.trim();
    if ((!updatedByUser || updatedByUser.length === 0) && profileName) {
      const { data: membersByName } = await admin
        .from('members')
        .select('id')
        .is('user_id', null)
        .ilike('name', profileName);
      if (membersByName?.length) {
        const ids = membersByName.map((m: { id: string }) => m.id);
        for (const id of ids) {
          await admin.from('members').update({ photo: publicUrl, user_id: user.id }).eq('id', id);
        }
      }
    }

    return NextResponse.json({ avatarUrl: publicUrl });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro ao enviar foto' },
      { status: 500 }
    );
  }
}

function extractStoragePath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const match = url.pathname.match(/\/storage\/v1\/object\/public\/avatars\/(.+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
