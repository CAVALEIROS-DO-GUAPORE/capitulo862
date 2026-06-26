import { createAdminClient } from '@/lib/supabase/admin';
import type { Member } from '@/types';

export async function enrichMembersWithPhotos(members: Member[]): Promise<Member[]> {
  const admin = createAdminClient();
  const userIds = members.map((m) => m.userId).filter(Boolean) as string[];
  const avatarByUserId = new Map<string, string>();
  const avatarByName = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: profilesById } = await admin
      .from('profiles')
      .select('id, avatar_url')
      .in('id', userIds);
    for (const p of profilesById ?? []) {
      if (p.avatar_url) avatarByUserId.set(p.id, p.avatar_url);
    }
  }

  const membersWithoutPhoto = members.filter((m) => !m.userId || !avatarByUserId.get(m.userId));
  if (membersWithoutPhoto.length > 0) {
    const { data: profilesWithAvatar } = await admin
      .from('profiles')
      .select('name, avatar_url')
      .not('avatar_url', 'is', null);
    for (const p of profilesWithAvatar ?? []) {
      const name = (p.name || '').trim();
      if (name && p.avatar_url) avatarByName.set(name.toLowerCase(), p.avatar_url);
    }
  }

  return members.map((m) => {
    const photo =
      m.photo ||
      (m.userId ? avatarByUserId.get(m.userId) : undefined) ||
      avatarByName.get((m.name || '').trim().toLowerCase());
    return photo ? { ...m, photo } : m;
  });
}
