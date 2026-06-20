import { NextResponse, type NextRequest } from 'next/server';
import { canViewCandidates, canEditCandidates } from '@/lib/candidatos-auth';

export async function GET(request: NextRequest) {
  const canView = await canViewCandidates(request);
  const canEdit = await canEditCandidates(request);
  return NextResponse.json({ canView, canEdit });
}
