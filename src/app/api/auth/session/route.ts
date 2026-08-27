import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/session.server';
import { getAdminDb } from '@/lib/firebaseAdmin.server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const account = token ? await verifySessionToken(token) : null;

  if (!account) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Resolve linkedStudentId from Firestore if not in JWT (for old sessions)
  let linkedStudentId = account.linkedStudentId;
  if (!linkedStudentId && (account.role === 'parent' || account.role === 'student')) {
    try {
      const adminDb = getAdminDb();
      if (adminDb) {
        const accDoc = await adminDb.collection('accounts').doc(account.id).get();
        if (accDoc.exists) {
          const data = accDoc.data() as any;
          if (data?.linkedStudentId) {
            linkedStudentId = data.linkedStudentId;
          }
          // If still not found, try to find by phone
          if (!linkedStudentId && account.phone) {
            const phone = account.phone.replace(/\D/g, '');
            const studentSnap = await adminDb.collection('students').limit(100).get().catch(() => null);
            if (studentSnap && !studentSnap.empty) {
              const matched = studentSnap.docs.find((d) => {
                const st = d.data() as any;
                const stPhone = (st.parentPhone || '').replace(/\D/g, '');
                return stPhone.length >= 8 && phone.length >= 8 && stPhone.slice(-8) === phone.slice(-8);
              });
              if (matched) {
                linkedStudentId = matched.id;
                // Persist for future logins
                adminDb.collection('accounts').doc(account.id).set(
                  { linkedStudentId: matched.id, onboardingRequired: false },
                  { merge: true }
                ).catch(() => {});
              }
            }
          }
        }
      }
    } catch {}
  }

  return NextResponse.json({
    ok: true,
    account: {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      schoolBranch: account.schoolBranch,
      phone: account.phone,
      linkedStudentId,
    },
  });
}
