import { NextResponse, type NextRequest } from 'next/server';
import { canManageMemberBadges } from '@/lib/badges-auth';
import { MEMBER_BADGES } from '@/lib/member-badges';

export async function GET(request: NextRequest) {
  const canManage = await canManageMemberBadges(request);
  return NextResponse.json({
    canManage,
    badges: MEMBER_BADGES,
  });
}
