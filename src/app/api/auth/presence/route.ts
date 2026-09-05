import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/session.server';
import { getAdminDb } from '@/lib/firebaseAdmin.server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ ok: false, error: 'No session' }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session || !session.id) {
      return NextResponse.json({ ok: false, error: 'Invalid session' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ ok: false, error: 'DB unavailable' }, { status: 503 });
    }

    const now = new Date().toISOString();

    // 1. Update account document
    const accountRef = adminDb.collection('accounts').doc(session.id);
    await accountRef.set({ lastActiveAt: now }, { merge: true }).catch(() => {});

    // 2. If student or parent, update their linked student record
    const targetStudentId = body.studentId || session.linkedStudentId;
    const role = body.role || session.role;

    if (targetStudentId) {
      const studentUpdate =
        role === 'student'
          ? { studentLastActiveAt: now, lastActiveAt: now }
          : role === 'parent'
          ? { parentLastActiveAt: now }
          : { lastActiveAt: now };

      await Promise.all([
        adminDb.collection('students').doc(targetStudentId).set(studentUpdate, { merge: true }).catch(() => {}),
        adminDb.collection('class_students').doc(targetStudentId).set(studentUpdate, { merge: true }).catch(() => {}),
      ]);
    }

    return NextResponse.json({ ok: true, now });
  } catch {
    return NextResponse.json({ ok: false, error: 'Presence error' }, { status: 500 });
  }
}
