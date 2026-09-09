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

export async function DELETE(req: NextRequest) {
  const auth = await requireRole(req, ['doctor', 'specialist', 'teacher']);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ ok: false, error: 'غير مصرح بحذف سجلات البصمة.' }, { status: 401 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: 'Firebase Admin غير مفعل.' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const isDeleteAll = Boolean(body.all === true);
  const targetDocId = typeof body.docId === 'string' ? body.docId.trim() : '';
  const targetUserId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const targetAccountId = typeof body.accountId === 'string' ? body.accountId.trim() : '';
  const targetStudentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const targetIds: string[] = Array.isArray(body.ids)
    ? body.ids.filter((id: unknown) => typeof id === 'string' && id.trim())
    : [];

  if (isDeleteAll) {
    // Delete ALL documents in faceRecordsV2
    const snap = await adminDb.collection('faceRecordsV2').get();
    const batchSize = 400;
    let deletedCount = 0;

    for (let i = 0; i < snap.docs.length; i += batchSize) {
      const chunk = snap.docs.slice(i, i + batchSize);
      const batch = adminDb.batch();
      chunk.forEach((doc) => {
        batch.delete(doc.ref);
        deletedCount++;
      });
      await batch.commit();
    }

    return NextResponse.json({
      ok: true,
      message: 'تم حذف جميع سجلات البصمة بنجاح.',
      deletedCount,
    });
  }

  // Deleting one or more specific records
  const idsToDelete = new Set<string>();
  if (targetDocId) idsToDelete.add(targetDocId);
  if (targetUserId) idsToDelete.add(targetUserId);
  if (targetAccountId) idsToDelete.add(targetAccountId);
  if (targetStudentId) idsToDelete.add(targetStudentId);
  targetIds.forEach(id => idsToDelete.add(id));

  if (idsToDelete.size === 0) {
    return NextResponse.json(
      { ok: false, error: 'يجب تحديد معرّف السجل أو المستخدم المراد حذفه.' },
      { status: 400 }
    );
  }

  // Find all docs in faceRecordsV2 that match any of these IDs
  const snap = await adminDb.collection('faceRecordsV2').get();
  const docsToDelete = snap.docs.filter((doc) => {
    if (idsToDelete.has(doc.id)) return true;
    const data = doc.data();
    if (data.userId && idsToDelete.has(data.userId)) return true;
    if (data.accountId && idsToDelete.has(data.accountId)) return true;
    if (data.studentId && idsToDelete.has(data.studentId)) return true;
    return false;
  });

  if (docsToDelete.length === 0) {
    // Direct fallback delete of passed IDs
    const batch = adminDb.batch();
    idsToDelete.forEach(id => {
      batch.delete(adminDb.collection('faceRecordsV2').doc(id));
    });
    await batch.commit().catch(() => {});
    return NextResponse.json({ ok: true, message: 'تم إتمام عملية الحذف.', deletedCount: idsToDelete.size });
  }

  const batch = adminDb.batch();
  docsToDelete.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  return NextResponse.json({
    ok: true,
    message: 'تم حذف سجل البصمة بنجاح.',
    deletedCount: docsToDelete.length,
  });
}

