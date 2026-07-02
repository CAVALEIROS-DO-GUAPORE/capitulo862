import { NextResponse, type NextRequest } from 'next/server';
import { canManageRaffles } from '@/lib/raffles-auth';

export async function GET(request: NextRequest) {
  const canManage = await canManageRaffles(request);
  return NextResponse.json({ canManage });
}
