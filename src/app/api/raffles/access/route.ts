import { NextResponse, type NextRequest } from 'next/server';
import { canAuditRaffles, canManageRaffles } from '@/lib/raffles-auth';

export async function GET(request: NextRequest) {
  const canManage = await canManageRaffles(request);
  const canAudit = await canAuditRaffles(request);
  return NextResponse.json({ canManage, canAudit });
}
