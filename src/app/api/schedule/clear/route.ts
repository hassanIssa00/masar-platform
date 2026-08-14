import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { authenticateRequest } from '@/lib/auth/authorization';
import { checkRateLimit, getClientIdentifier, getIpIdentifier } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.authorized || !['doctor', 'teacher', 'specialist'].includes(auth.user?.role || '')) {
      return NextResponse.json({ success: false, error: 'Unauthorized schedule clear request' }, { status: 401 });
    }

    const limit = await checkRateLimit(
      'schedule_clear',
      getClientIdentifier(req, auth.user?.id),
      { windowMs: 60 * 1000, maxRequests: 4, failClosed: false },
      { identifier: getIpIdentifier(req), maxRequests: 12 },
    );
    if (!limit.allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    await deleteDoc(doc(db, 'smart_schedules', 'IKHLAS_JEDDAH_SCHEDULE'));
    return NextResponse.json({ success: true, message: 'Schedule cleared from Firestore' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Schedule clear failed';
    console.error('[Schedule Clear Error]:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
