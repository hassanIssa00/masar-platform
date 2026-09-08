import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/authorization';
import { getAdminDb } from '@/lib/firebaseAdmin.server';

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['doctor', 'specialist', 'teacher']);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ ok: false, error: 'غير مصرح.' }, { status: 401 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: 'Firebase Admin غير مفعل.' }, { status: 503 });
  }

  const snap = await adminDb.collection('faceRecordsV2').get();

  // De-duplicate by real userId — a single person may have up to 3 docs (userId / accountId / studentId)
  const seen = new Set<string>();
  const records: object[] = [];

  snap.docs.forEach((doc) => {
    const data = doc.data();
    const uid = data.userId || doc.id;
    // Skip duplicate records for the same person
    if (seen.has(uid)) return;
    seen.add(uid);
    // Also mark accountId / studentId so we don't show the duplicates
    if (data.accountId) seen.add(data.accountId);
    if (data.studentId) seen.add(data.studentId);

    // Return record WITHOUT the raw embedding vector (privacy + bandwidth)
    records.push({
      docId:        doc.id,
      userId:       data.userId,
      accountId:    data.accountId,
      studentId:    data.studentId,
      userName:     data.userName,
      userEmail:    data.userEmail,
      userRole:     data.userRole,
      schoolBranch: data.schoolBranch,
      enrolledAt:   data.enrolledAt || data.updatedAt || null,
    });
  });

  return NextResponse.json({ ok: true, records, total: records.length });
}
