import { NextResponse, type NextRequest } from 'next/server';
import { canManageEditais } from '@/lib/editais-auth';

export async function GET(request: NextRequest) {
  const canManage = await canManageEditais(request);
  return NextResponse.json({ canManage });
}
