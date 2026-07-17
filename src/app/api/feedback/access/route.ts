import { NextResponse, type NextRequest } from 'next/server';
import { canSubmitFeedback, canViewFeedback } from '@/lib/feedback-auth';

export async function GET(request: NextRequest) {
  const [canSubmit, canView] = await Promise.all([
    canSubmitFeedback(request),
    canViewFeedback(request),
  ]);
  return NextResponse.json({ canSubmit, canView });
}
