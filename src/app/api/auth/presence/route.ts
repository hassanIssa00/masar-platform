import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/session.server';
import { getAdminDb } from '@/lib/firebaseAdmin.server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    let session = null;
    if (token) {
      session = await verifySessionToken(token).catch(() => null);
    }

    const body = await req.json().catch(() => ({}));
    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ ok: false, error: 'DB unavailable' }, { status: 503 });
    }

    const now = new Date().toISOString();

    // 1. Update account document if session is valid
    if (session?.id) {
      const accountRef = adminDb.collection('accounts').doc(session.id);
      await accountRef.set({ lastActiveAt: now }, { merge: true }).catch(() => {});
    }

    // 2. Resolve student and role
    const targetStudentId = body.studentId || session?.linkedStudentId || (body.role === 'student' ? body.id : undefined);
    const studentName = (body.studentName || session?.name || '').trim();
    const role = body.role || session?.role || 'student';

    if (targetStudentId || studentName) {
      const studentUpdate =
        role === 'student'
          ? { studentLastActiveAt: now, lastActiveAt: now }
          : role === 'parent'
          ? { parentLastActiveAt: now, lastActiveAt: now }
          : { lastActiveAt: now };

      const promises: Promise<any>[] = [];

      if (targetStudentId) {
        // Direct set on students collection
        promises.push(
          adminDb.collection('students').doc(targetStudentId).set(studentUpdate, { merge: true }).catch(() => {})
        );

        // Direct set on class_students with merge: true (never fail if doc was keyed by this id)
        promises.push(
          adminDb.collection('class_students').doc(targetStudentId).set(studentUpdate, { merge: true }).catch(() => {})
        );

        // Query class_students by id field
        promises.push(
          adminDb.collection('class_students').where('id', '==', targetStudentId).get().then(snap => {
            const batch = adminDb.batch();
            snap.docs.forEach(d => batch.set(d.ref, studentUpdate, { merge: true }));
            return batch.commit().catch(() => {});
          }).catch(() => {})
        );

        // Query class_students by studentAccountId field
        promises.push(
          adminDb.collection('class_students').where('studentAccountId', '==', targetStudentId).get().then(snap => {
            const batch = adminDb.batch();
            snap.docs.forEach(d => batch.set(d.ref, studentUpdate, { merge: true }));
            return batch.commit().catch(() => {});
          }).catch(() => {})
        );
      }

      // Query class_students by name match (accounting for 'فصل ' prefix)
      if (studentName && studentName.length >= 3) {
        const cleanTarget = studentName.replace(/^فصل\s*[:\-–\/]?\s*/i, '').trim().toLowerCase();
        promises.push(
          adminDb.collection('class_students').limit(50).get().then(snap => {
            const batch = adminDb.batch();
            let count = 0;
            snap.docs.forEach(d => {
              const data = d.data();
              const fullName = String(data.fullName || data.name || '').trim().toLowerCase();
              const cleanFull = fullName.replace(/^فصل\s*[:\-–\/]?\s*/i, '').trim();
              if (cleanFull && cleanTarget && (cleanFull === cleanTarget || cleanFull.includes(cleanTarget) || cleanTarget.includes(cleanFull))) {
                batch.set(d.ref, studentUpdate, { merge: true });
                count++;
              }
            });
            if (count > 0) return batch.commit().catch(() => {});
          }).catch(() => {})
        );
      }

      await Promise.all(promises);
    }

    return NextResponse.json({ ok: true, now });
  } catch {
    return NextResponse.json({ ok: false, error: 'Presence error' }, { status: 500 });
  }
}
